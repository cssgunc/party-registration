import enum
import inspect
import math
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, time
from typing import ClassVar, Literal, overload
from zoneinfo import ZoneInfo

from fastapi import Depends
from sqlalchemy import Time as SATime
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import BadRequestException, NotFoundException
from src.core.utils.date_utils import hours_ahead, is_same_academic_year
from src.core.utils.excel_utils import export_to_excel
from src.core.utils.phone_utils import digits_only, format_phone
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
)
from src.modules.account.account_entity import AccountEntity
from src.modules.location.location_model import LocationDto
from src.modules.student.student_service import StudentService

from ..location.location_entity import LocationEntity
from ..location.location_service import LocationNotFoundException, LocationService
from ..notification.notification_service import NotificationService
from ..student.student_entity import StudentEntity
from .party_entity import PartyEntity
from .party_model import (
    AdminCreatePartyDto,
    ExactMatchDto,
    PaginatedPartiesPoliceResponse,
    PaginatedPartiesResponse,
    PartyDraft,
    PartyDto,
    PartyStatus,
    ProximitySearchResponse,
    StudentCreatePartyDto,
)

_ET = ZoneInfo("America/New_York")

_PARTY_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": PartyEntity.id,
        "party_datetime": PartyEntity.party_datetime,
        "party_datetime_time": cast(PartyEntity.party_datetime, SATime()),
        "status": PartyEntity.status,
        "contact_one.id": PartyEntity.contact_one_id,
        "contact_one.first_name": AccountEntity.first_name,
        "contact_one.last_name": AccountEntity.last_name,
        "contact_one.full_name": func.concat(
            AccountEntity.first_name, " ", AccountEntity.last_name
        ),
        "contact_one.email": AccountEntity.email,
        "contact_one.phone_number": StudentEntity.phone_number,
        "contact_one.onyen": AccountEntity.onyen,
        "contact_one.pid": AccountEntity.pid,
        "contact_one.contact_preference": StudentEntity.contact_preference,
        "contact_one.last_registered": StudentEntity.last_registered,
        "contact_two.email": PartyEntity.contact_two_email,
        "contact_two.first_name": PartyEntity.contact_two_first_name,
        "contact_two.last_name": PartyEntity.contact_two_last_name,
        "contact_two.full_name": func.concat(
            PartyEntity.contact_two_first_name, " ", PartyEntity.contact_two_last_name
        ),
        "contact_two.phone_number": PartyEntity.contact_two_phone_number,
        "contact_two.contact_preference": PartyEntity.contact_two_contact_preference,
        "location.id": PartyEntity.location_id,
        "location.google_place_id": LocationEntity.google_place_id,
        "location.formatted_address": LocationEntity.formatted_address,
        "location.hold_expiration": LocationEntity.hold_expiration,
    },
    searchable=(
        "location.formatted_address",
        "location.google_place_id",
        "contact_one.full_name",
        "contact_one.email",
        "contact_one.onyen",
        "contact_one.pid",
        "contact_one.phone_number",
        "contact_two.full_name",
        "contact_two.email",
        "contact_two.phone_number",
    ),
    default_sort=SortParam(field="party_datetime", order=SortOrder.DESC),
)

_PARTY_LOAD_OPTIONS = (
    selectinload(PartyEntity.location),
    selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
    selectinload(PartyEntity.contact_one).selectinload(StudentEntity.residence),
)


async def _has_same_day_conflict(draft: "PartyDraft", session: AsyncSession) -> bool:
    """Return True if the student already has a non-cancelled party on the same Eastern-time date.

    The DB stores datetimes in UTC, so we convert the ET calendar day to a UTC range for the query.
    """
    et_date = draft.party_datetime.astimezone(_ET).date()
    day_start_utc = datetime.combine(et_date, time.min, tzinfo=_ET).astimezone(UTC)
    day_end_utc = datetime.combine(et_date, time.max, tzinfo=_ET).astimezone(UTC)
    stmt = select(PartyEntity.id).where(
        PartyEntity.contact_one_id == draft.contact_one.id,
        PartyEntity.status != PartyStatus.CANCELLED,
        PartyEntity.party_datetime >= day_start_utc,
        PartyEntity.party_datetime <= day_end_utc,
    )
    if draft.existing is not None:
        stmt = stmt.where(PartyEntity.id != draft.existing.id)
    result = await session.execute(stmt.limit(1))
    return result.scalar_one_or_none() is not None


class PartyRule(enum.Enum):
    """Validation rules for party operations. The enum value is the API error code.
    Each rule's predicate returns True when the violation applies (matching the code name).
    Predicates may be sync (lambda) or async (taking draft + session for DB queries)."""

    STUDENT_INFO_NOT_PROVIDED = (
        "STUDENT_INFO_NOT_PROVIDED",
        "Contact one must have a phone number and contact preference set",
        lambda d: d.contact_one.phone_number is None or d.contact_one.contact_preference is None,
    )
    PARTY_DATE_TOO_SOON = (
        "PARTY_DATE_TOO_SOON",
        "Party must be at least 24 hours in the future",
        lambda d: hours_ahead(d.party_datetime) < env.PARTY_MIN_LEAD_HOURS,
    )
    PARTY_SAME_DAY = (
        "PARTY_SAME_DAY",
        "A party is already registered on that day",
        _has_same_day_conflict,
    )
    PARTY_DATE_TOO_FAR = (
        "PARTY_DATE_TOO_FAR",
        "Party cannot be scheduled more than 30 days in advance",
        lambda d: hours_ahead(d.party_datetime) > env.PARTY_MAX_LEAD_DAYS * 24,
    )
    PARTY_SMART_NOT_COMPLETED = (
        "PARTY_SMART_NOT_COMPLETED",
        "Student must complete Party Smart in the current academic year",
        lambda d: d.contact_one.last_registered is None
        or not is_same_academic_year(d.contact_one.last_registered),
    )
    NO_RESIDENCE = (
        "NO_RESIDENCE",
        "Student must choose a residence before registering a party",
        lambda d: d.location is None,
    )
    LOCATION_HOLD_ACTIVE = (
        "LOCATION_HOLD_ACTIVE",
        "Location has an active hold and cannot host a party right now",
        lambda d: d.location is not None and d.location.has_active_hold(),
    )
    CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE = (
        "CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE",
        "Contact two email must differ from contact one's",
        lambda d: d.contact_two.email.strip().lower() == d.contact_one.email.strip().lower(),
    )
    CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE = (
        "CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE",
        "Contact two phone number must differ from contact one's",
        lambda d: digits_only(d.contact_one.phone_number or "")
        == digits_only(d.contact_two.phone_number),
    )
    PARTY_CANCELLED = (
        "PARTY_CANCELLED",
        "Party has already been cancelled",
        lambda d: d.existing is not None and d.existing.status == PartyStatus.CANCELLED,
    )
    PARTY_IN_PAST = (
        "PARTY_IN_PAST",
        "Cannot modify a party that has already occurred",
        lambda d: d.existing is not None and d.existing.party_datetime <= datetime.now(UTC),
    )
    PARTY_NOT_OWNED_BY_STUDENT = (
        "PARTY_NOT_OWNED_BY_STUDENT",
        "Student does not own this party",
        lambda d: d.existing is not None and d.existing.contact_one.id != d.contact_one.id,
    )

    message: str
    is_violated_by: (
        Callable[["PartyDraft"], bool] | Callable[["PartyDraft", AsyncSession], Awaitable[bool]]
    )

    def __new__(
        cls,
        code: str,
        message: str,
        is_violated_by: (
            Callable[["PartyDraft"], bool] | Callable[["PartyDraft", AsyncSession], Awaitable[bool]]
        ),
    ):
        obj = object.__new__(cls)
        obj._value_ = code
        obj.message = message
        obj.is_violated_by = is_violated_by
        return obj


class PartyValidationException(BadRequestException):
    def __init__(self, rule: PartyRule):
        self.rule = rule
        super().__init__(detail={"code": rule.value, "message": rule.message})


class PartyNotFoundException(NotFoundException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} not found")


class PartyService:
    QUERY_FIELDS: ClassVar[QueryFieldSet] = _PARTY_QUERY_FIELDS

    def __init__(
        self,
        session: AsyncSession = Depends(get_session),
        location_service: LocationService = Depends(),
        student_service: StudentService = Depends(),
        query_service: QueryService = Depends(),
        notification_service: NotificationService = Depends(),
    ):
        self.session = session
        self.location_service = location_service
        self.student_service = student_service
        self.query_service = query_service
        self.notification_service = notification_service

    async def _check_rules(self, draft: PartyDraft, *rules: PartyRule) -> None:
        """Check the draft against the given rules, raising on the first violation.
        Predicates may be sync or async; async ones receive self.session for DB queries."""
        for rule in rules:
            if inspect.iscoroutinefunction(rule.is_violated_by):
                violated = await rule.is_violated_by(draft, self.session)  # type: ignore[call-arg]
            else:
                violated = rule.is_violated_by(draft)  # type: ignore[call-arg]
            if violated:
                raise PartyValidationException(rule)

    async def _get_party_entity_by_id(self, party_id: int) -> PartyEntity:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.id == party_id).options(*_PARTY_LOAD_OPTIONS)
        )
        party_entity = result.scalar_one_or_none()
        if party_entity is None:
            raise PartyNotFoundException(party_id)
        return party_entity

    @overload
    async def get_parties_paginated(
        self, params: ListQueryParams, as_police: Literal[True]
    ) -> PaginatedPartiesPoliceResponse: ...

    @overload
    async def get_parties_paginated(
        self, params: ListQueryParams, as_police: Literal[False] = ...
    ) -> PaginatedPartiesResponse: ...

    async def get_parties_paginated(
        self, params: ListQueryParams, as_police: bool = False
    ) -> PaginatedPartiesResponse | PaginatedPartiesPoliceResponse:
        """
        Get parties with server-side pagination, sorting, and filtering.

        Query parameters are automatically parsed from the request:
        - page_number: Page number (1-indexed, default: 1)
        - page_size: Items per page (default: all)
        - sort_by: Field to sort by
        - sort_order: Sort order ('asc' or 'desc')
        - location_id: Filter by location ID
        - contact_one_id: Filter by contact one (student) ID

        Returns:
            PaginatedPartiesResponse (staff/admin) or PaginatedPartiesPoliceResponse (police)
        """
        base_query = (
            select(PartyEntity)
            .join(LocationEntity, PartyEntity.location_id == LocationEntity.id)
            .join(StudentEntity, PartyEntity.contact_one_id == StudentEntity.account_id)
            .join(AccountEntity, StudentEntity.account_id == AccountEntity.id)
            .options(*_PARTY_LOAD_OPTIONS)
        )

        converter = (lambda e: e.to_police_dto()) if as_police else (lambda e: e.to_dto())
        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            dto_converter=converter,
            field_set=_PARTY_QUERY_FIELDS,
        )
        if as_police:
            return PaginatedPartiesPoliceResponse(**result.model_dump())
        return PaginatedPartiesResponse(**result.model_dump())

    async def get_party_by_id(self, party_id: int) -> PartyDto:
        party_entity = await self._get_party_entity_by_id(party_id)
        return party_entity.to_dto()

    async def get_parties_by_contact(self, student_id: int) -> list[PartyDto]:
        """Get all parties for a specific student (no pagination)."""
        result = await self.session.execute(
            select(PartyEntity)
            .where(
                PartyEntity.contact_one_id == student_id,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
            .options(*_PARTY_LOAD_OPTIONS)
        )
        parties = result.scalars().all()
        return [party.to_dto() for party in parties]

    async def _build_student_draft(
        self,
        dto: StudentCreatePartyDto,
        student_id: int,
        existing: PartyDto | None = None,
    ) -> PartyDraft:
        """Gather data for a student-initiated party. Does not run validation rules:
        location is None if the student has no residence; phone/contact_preference
        may be None. The rules layer catches these cases.
        """
        student = await self.student_service.get_student_by_id(student_id)
        location = student.residence.location if student.residence is not None else None
        return PartyDraft(
            party_datetime=dto.party_datetime,
            location=location,
            contact_one=student,
            contact_two=dto.contact_two,
            existing=existing,
        )

    async def _build_admin_draft(
        self,
        dto: AdminCreatePartyDto,
        existing: PartyDto | None = None,
    ) -> PartyDraft:
        """Gather all data for an admin-initiated party.
        Admins skip the residence/hold flow: location is created/fetched directly.
        """
        contact_one = await self.student_service.get_student_by_id(dto.contact_one_student_id)
        location = await self.location_service.get_or_create_location(dto.google_place_id)
        return PartyDraft(
            party_datetime=dto.party_datetime,
            location=location,
            contact_one=contact_one,
            contact_two=dto.contact_two,
            existing=existing,
        )

    async def create_party_from_student_dto(
        self, dto: StudentCreatePartyDto, student_id: int
    ) -> PartyDto:
        draft = await self._build_student_draft(dto, student_id)
        await self._check_rules(
            draft,
            PartyRule.STUDENT_INFO_NOT_PROVIDED,
            PartyRule.PARTY_SAME_DAY,
            PartyRule.PARTY_DATE_TOO_SOON,
            PartyRule.PARTY_DATE_TOO_FAR,
            PartyRule.PARTY_SMART_NOT_COMPLETED,
            PartyRule.NO_RESIDENCE,
            PartyRule.LOCATION_HOLD_ACTIVE,
            PartyRule.CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE,
            PartyRule.CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE,
        )
        new_party = PartyEntity.from_draft(draft)
        self.session.add(new_party)
        await self.session.commit()
        party_dto = await new_party.load_dto(self.session)
        await self.notification_service.notify_party_created(party_dto)
        return party_dto

    async def create_party_from_admin_dto(self, dto: AdminCreatePartyDto) -> PartyDto:
        draft = await self._build_admin_draft(dto)
        await self._check_rules(
            draft,
            PartyRule.STUDENT_INFO_NOT_PROVIDED,
            PartyRule.CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE,
            PartyRule.CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE,
        )
        new_party = PartyEntity.from_draft(draft)
        self.session.add(new_party)
        await self.session.commit()
        party_dto = await new_party.load_dto(self.session)
        await self.notification_service.notify_party_created(party_dto)
        return party_dto

    async def update_party_from_student_dto(
        self, party_id: int, dto: StudentCreatePartyDto, student_id: int
    ) -> PartyDto:
        party_entity = await self._get_party_entity_by_id(party_id)
        old_contact_two_email = party_entity.contact_two_email
        draft = await self._build_student_draft(dto, student_id, existing=party_entity.to_dto())
        await self._check_rules(
            draft,
            PartyRule.STUDENT_INFO_NOT_PROVIDED,
            PartyRule.PARTY_NOT_OWNED_BY_STUDENT,
            PartyRule.PARTY_CANCELLED,
            PartyRule.PARTY_IN_PAST,
            PartyRule.PARTY_SAME_DAY,
            PartyRule.PARTY_DATE_TOO_SOON,
            PartyRule.PARTY_DATE_TOO_FAR,
            PartyRule.PARTY_SMART_NOT_COMPLETED,
            PartyRule.NO_RESIDENCE,
            PartyRule.LOCATION_HOLD_ACTIVE,
            PartyRule.CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE,
            PartyRule.CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE,
        )
        party_entity.apply_draft(draft)
        self.session.add(party_entity)
        await self.session.commit()
        party_dto = await party_entity.load_dto(self.session)
        if draft.contact_two.email.lower() != old_contact_two_email.lower():
            await self.notification_service.notify_contact_two_changed(party_dto)
        return party_dto

    async def update_party_from_admin_dto(
        self, party_id: int, dto: AdminCreatePartyDto
    ) -> PartyDto:
        party_entity = await self._get_party_entity_by_id(party_id)
        old_contact_two_email = party_entity.contact_two_email
        draft = await self._build_admin_draft(dto, existing=party_entity.to_dto())
        await self._check_rules(
            draft,
            PartyRule.STUDENT_INFO_NOT_PROVIDED,
            PartyRule.CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE,
            PartyRule.CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE,
        )
        party_entity.apply_draft(draft)
        self.session.add(party_entity)
        await self.session.commit()
        party_dto = await party_entity.load_dto(self.session)
        if draft.contact_two.email.lower() != old_contact_two_email.lower():
            await self.notification_service.notify_contact_two_changed(party_dto)
        return party_dto

    async def cancel_party(self, party_id: int, student_id: int | None) -> PartyDto:
        """Cancel a party. If student_id is given, only the owner can cancel.
        Idempotent: cancelling an already-cancelled party is a no-op."""
        party_entity = await self._get_party_entity_by_id(party_id)

        if student_id is not None and party_entity.contact_one_id != student_id:
            raise PartyValidationException(PartyRule.PARTY_NOT_OWNED_BY_STUDENT)

        if party_entity.status == PartyStatus.CANCELLED:
            return party_entity.to_dto()

        if student_id is not None and party_entity.has_occurred():
            raise PartyValidationException(PartyRule.PARTY_IN_PAST)

        party_entity.status = PartyStatus.CANCELLED
        self.session.add(party_entity)
        await self.session.commit()

        return party_entity.to_dto()

    async def restore_party(self, party_id: int) -> PartyDto:
        """Restore a cancelled party to CONFIRMED. Admin-only at the router level.
        Idempotent: restoring an already-confirmed party is a no-op."""
        party_entity = await self._get_party_entity_by_id(party_id)

        if party_entity.status == PartyStatus.CONFIRMED:
            return party_entity.to_dto()

        party_entity.status = PartyStatus.CONFIRMED
        self.session.add(party_entity)
        await self.session.commit()

        return party_entity.to_dto()

    async def get_proximity_search(
        self,
        google_place_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> ProximitySearchResponse:
        """Resolve the location for `google_place_id`, then return:
        - exact_match: the searched place plus the confirmed party at that exact location, if any
        - nearby: other confirmed parties within env.PARTY_SEARCH_RADIUS_MILES, sorted by distance
        """
        try:
            db_location: LocationDto | None = await self.location_service.get_location_by_place_id(
                google_place_id
            )
        except LocationNotFoundException:
            db_location = None

        if db_location is not None:
            formatted_address = db_location.formatted_address
            search_lat = float(db_location.latitude)
            search_lon = float(db_location.longitude)
        else:
            place_details = await self.location_service.get_place_details(google_place_id)
            formatted_address = place_details.formatted_address
            search_lat = place_details.latitude
            search_lon = place_details.longitude

        result = await self.session.execute(
            select(PartyEntity)
            .options(*_PARTY_LOAD_OPTIONS)
            .where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
                PartyEntity.status != PartyStatus.CANCELLED,
            )
        )
        parties = result.scalars().all()

        exact_party = None
        if db_location is not None:
            for p in parties:
                if p.location_id == db_location.id:
                    exact_party = p.to_police_dto()
                    break

        nearby_with_distance: list[tuple[PartyEntity, float]] = []
        for p in parties:
            if p.location is None:
                continue
            distance = self._calculate_haversine_distance(
                search_lat,
                search_lon,
                float(p.location.latitude),
                float(p.location.longitude),
            )
            if distance <= env.PARTY_SEARCH_RADIUS_MILES:
                nearby_with_distance.append((p, distance))
        nearby_with_distance.sort(key=lambda x: x[1])
        nearby = [
            p.to_police_dto()
            for p, _ in nearby_with_distance
            if exact_party is None or p.id != exact_party.id
        ]

        return ProximitySearchResponse(
            exact_match=ExactMatchDto(
                google_place_id=google_place_id,
                formatted_address=formatted_address,
                location=db_location,
                party=exact_party,
            ),
            nearby=nearby,
        )

    def _calculate_haversine_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        r = 3959
        return c * r

    def export_parties_to_excel_police(self, parties_response: PaginatedPartiesResponse) -> bytes:
        return export_to_excel(
            resource_name="Parties",
            field_map={
                "Address": lambda p: p.location.formatted_address,
                "Date of Party": lambda p: p.party_datetime.strftime("%Y-%m-%d"),
                "Time of Party": lambda p: p.party_datetime.strftime("%-I:%M %p"),
                "Contact One Full Name": lambda p: (
                    f"{p.contact_one.first_name} {p.contact_one.last_name}"
                ),
                "Contact One Email": lambda p: p.contact_one.email,
                "Contact One Phone Number": lambda p: format_phone(
                    p.contact_one.phone_number or ""
                ),
                "Contact One Contact Preference": lambda p: (
                    p.contact_one.contact_preference.value.capitalize()
                    if p.contact_one.contact_preference
                    else None
                ),
                "Contact Two Full Name": lambda p: (
                    f"{p.contact_two.first_name} {p.contact_two.last_name}"
                ),
                "Contact Two Email": lambda p: p.contact_two.email,
                "Contact Two Phone Number": lambda p: format_phone(p.contact_two.phone_number),
                "Contact Two Contact Preference": lambda p: (
                    p.contact_two.contact_preference.value.capitalize()
                ),
            },
            items=parties_response.items,
        )

    def export_parties_to_excel_staff(self, parties_response: PaginatedPartiesResponse) -> bytes:
        return export_to_excel(
            resource_name="Parties",
            field_map={
                "Address": lambda p: p.location.formatted_address,
                "Date of Party": lambda p: p.party_datetime.strftime("%Y-%m-%d"),
                "Time of Party": lambda p: p.party_datetime.strftime("%-I:%M %p"),
                "Contact One First Name": lambda p: p.contact_one.first_name,
                "Contact One Last Name": lambda p: p.contact_one.last_name,
                "Contact One Email": lambda p: p.contact_one.email,
                "Contact One Phone Number": lambda p: format_phone(
                    p.contact_one.phone_number or ""
                ),
                "Contact One Contact Preference": lambda p: (
                    p.contact_one.contact_preference.value.capitalize()
                    if p.contact_one.contact_preference
                    else None
                ),
                "Contact One Residence": lambda p: (
                    p.contact_one.residence.location.formatted_address
                    if p.contact_one.residence
                    else ""
                ),
                "Contact Two First Name": lambda p: p.contact_two.first_name,
                "Contact Two Last Name": lambda p: p.contact_two.last_name,
                "Contact Two Email": lambda p: p.contact_two.email,
                "Contact Two Phone Number": lambda p: format_phone(p.contact_two.phone_number),
                "Contact Two Contact Preference": lambda p: (
                    p.contact_two.contact_preference.value.capitalize()
                ),
            },
            items=parties_response.items,
        )
