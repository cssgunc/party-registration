from datetime import UTC, datetime

import pytest
import pytest_asyncio
from httpx import AsyncClient
from src.modules.account.account_entity import AccountRole
from src.modules.party.party_model import PartyDto
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference, StudentData, StudentDto
from src.modules.student.student_service import (
    AccountNotFoundException,
    InvalidAccountRoleException,
    StudentAlreadyExistsException,
    StudentConflictException,
    StudentNotFoundException,
)
from test.modules.account.account_utils import AccountTestUtils
from test.modules.location.location_utils import GmapsMockUtils, LocationTestUtils
from test.modules.party.party_utils import PartyTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.http.assertions import (
    assert_res_failure,
    assert_res_paginated,
    assert_res_success,
    assert_res_validation_error,
)
from test.utils.http.test_templates import generate_auth_required_tests

test_student_authentication = generate_auth_required_tests(
    ({"admin", "staff"}, "GET", "/api/students", None),
    ({"admin", "staff"}, "GET", "/api/students/12345", None),
    ({"admin"}, "POST", "/api/students", StudentTestUtils.get_sample_create_data()),
    ({"admin"}, "PUT", "/api/students/12345", StudentTestUtils.get_sample_data()),
    ({"admin"}, "DELETE", "/api/students/12345", None),
    ({"admin", "staff"}, "PATCH", "/api/students/12345/is-registered", {"is_registered": True}),
    ({"student"}, "GET", "/api/students/me", None),
    ({"student"}, "PUT", "/api/students/me", StudentTestUtils.get_sample_data()),
    ({"student"}, "GET", "/api/students/me/parties", None),
)


class TestStudentListRouter:
    """Tests for GET /api/students endpoint."""

    admin_client: AsyncClient
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, student_utils: StudentTestUtils, admin_client: AsyncClient):
        self.student_utils = student_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_list_students_empty(self):
        """Test listing students when database is empty."""
        response = await self.admin_client.get("/api/students")
        paginated = assert_res_paginated(
            response,
            StudentDto,
            total_records=0,
            page_number=1,
            page_size=0,
        )
        assert paginated.items == []

    @pytest.mark.asyncio
    async def test_list_students_with_data(self):
        """Test listing students when multiple students exist."""
        students = await self.student_utils.create_many(i=3)

        response = await self.admin_client.get("/api/students")
        paginated = assert_res_paginated(
            response,
            StudentDto,
            total_records=3,
            page_number=1,
            page_size=3,
        )

        # Verify student data
        data_by_id = {student.id: student for student in paginated.items}
        for entity in students:
            assert entity.account_id in data_by_id
            self.student_utils.assert_matches(entity, data_by_id[entity.account_id])

    @pytest.mark.parametrize(
        "total_students, page_number, page_size, expected_items",
        [
            (15, None, None, 15),  # Default pagination (no params)
            (25, 1, 5, 5),  # Custom page size - first page
            (15, 2, 10, 5),  # Second page with items
            (23, 3, 10, 3),  # Last page with partial results
            (5, 10, 10, 0),  # Page beyond total (empty results)
            (100, 1, 100, 100),  # Maximum page size
        ],
    )
    @pytest.mark.asyncio
    async def test_list_students_pagination(
        self,
        total_students: int,
        page_number: int | None,
        page_size: int | None,
        expected_items: int,
    ):
        """Test various pagination scenarios."""
        await self.student_utils.create_many(i=total_students)

        # Build params dict, excluding None values
        params = {}
        if page_number is not None:
            params["page_number"] = page_number
        if page_size is not None:
            params["page_size"] = page_size

        response = await self.admin_client.get("/api/students", params=params or None)

        # For default pagination (no params), expect page_size to equal total_records
        expected_page_number = page_number if page_number is not None else 1
        expected_page_size = page_size if page_size is not None else total_students

        paginated = assert_res_paginated(
            response,
            StudentDto,
            total_records=total_students,
            page_number=expected_page_number,
            page_size=expected_page_size,
        )
        assert len(paginated.items) == expected_items

    @pytest.mark.parametrize(
        "invalid_params",
        [
            {"page_number": 0},
            {"page_number": -1},
            {"page_size": 0},
            {"page_size": -1},
            {"page_size": 101},
            {"page_number": 0, "page_size": 50},
            {"page_number": 2, "page_size": -5},
        ],
    )
    @pytest.mark.asyncio
    async def test_list_students_pagination_invalid_params(self, invalid_params: dict):
        """Test that invalid params return 422."""
        response = await self.admin_client.get("/api/students", params=invalid_params)
        assert_res_validation_error(response)


class TestStudentListSortFilter:
    """Tests for sorting and filtering on GET /api/students endpoint."""

    admin_client: AsyncClient
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, student_utils: StudentTestUtils, admin_client: AsyncClient):
        self.student_utils = student_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_list_students_sort_by_phone_asc(self):
        """Test sorting students by phone number ascending."""
        await self.student_utils.create_one(phone_number="9199999999")
        await self.student_utils.create_one(phone_number="9191111111")
        await self.student_utils.create_one(phone_number="9195555555")

        response = await self.admin_client.get(
            "/api/students", params={"sort_by": "phone_number", "sort_order": "asc"}
        )

        paginated = assert_res_paginated(response, StudentDto, total_records=3)
        phones = [s.phone_number for s in paginated.items]
        assert phones == ["9191111111", "9195555555", "9199999999"]

    @pytest.mark.asyncio
    async def test_list_students_sort_by_phone_desc(self):
        """Test sorting students by phone number descending."""
        await self.student_utils.create_one(phone_number="9199999999")
        await self.student_utils.create_one(phone_number="9191111111")
        await self.student_utils.create_one(phone_number="9195555555")

        response = await self.admin_client.get(
            "/api/students", params={"sort_by": "phone_number", "sort_order": "desc"}
        )

        paginated = assert_res_paginated(response, StudentDto, total_records=3)
        phones = [s.phone_number for s in paginated.items]
        assert phones == ["9199999999", "9195555555", "9191111111"]

    @pytest.mark.asyncio
    async def test_list_students_filter_by_contact_preference(self):
        """Test filtering students by contact preference."""
        await self.student_utils.create_one(contact_preference=ContactPreference.TEXT)
        await self.student_utils.create_one(contact_preference=ContactPreference.CALL)
        await self.student_utils.create_one(contact_preference=ContactPreference.TEXT)

        response = await self.admin_client.get(
            "/api/students", params={"contact_preference": "text"}
        )

        paginated = assert_res_paginated(response, StudentDto, total_records=2)
        assert all(s.contact_preference == ContactPreference.TEXT for s in paginated.items)

    @pytest.mark.asyncio
    async def test_list_students_filter_by_last_registered_gte(self):
        """Test filtering students by last_registered >= date."""
        old_date = datetime(2023, 1, 1, tzinfo=UTC)
        recent_date = datetime(2024, 6, 1, tzinfo=UTC)

        await self.student_utils.create_one(last_registered=old_date)
        await self.student_utils.create_one(last_registered=recent_date)
        await self.student_utils.create_one(last_registered=None)

        response = await self.admin_client.get(
            "/api/students", params={"last_registered_gte": "2024-01-01"}
        )

        paginated = assert_res_paginated(response, StudentDto, total_records=1)
        assert paginated.items[0].last_registered is not None
        assert paginated.items[0].last_registered >= datetime(2024, 1, 1, tzinfo=UTC)


class TestStudentCRUDRouter:
    """Tests for CRUD operations on /api/students endpoints."""

    admin_client: AsyncClient
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(self, student_utils: StudentTestUtils, admin_client: AsyncClient):
        self.student_utils = student_utils
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_create_student_success(self):
        """Test successfully creating a student."""
        payload = await self.student_utils.next_student_create()

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        data = assert_res_success(response, StudentDto, status=201)

        self.student_utils.assert_matches(payload.data, data)
        assert data.id == payload.account_id

    @pytest.mark.asyncio
    async def test_create_student_with_datetime(self):
        """Test creating a student with last_registered datetime."""
        dt = datetime(2024, 3, 15, 10, 30, 0, tzinfo=UTC)
        payload = await self.student_utils.next_student_create(last_registered=dt)

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        data = assert_res_success(response, StudentDto, status=201)

        self.student_utils.assert_matches(payload.data, data)
        assert data.last_registered is not None

    @pytest.mark.asyncio
    async def test_create_student_nonexistent_account(self):
        """Test creating a student with non-existent account ID."""
        payload = await self.student_utils.next_student_create(account_id=999)

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        assert_res_failure(response, AccountNotFoundException(999))

    @pytest.mark.asyncio
    async def test_create_student_wrong_role(self):
        """Test creating a student with account that has non-student role."""
        account = await self.student_utils.account_utils.create_one(role=AccountRole.ADMIN.value)
        payload = await self.student_utils.next_student_create(account_id=account.id)

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        assert_res_failure(response, InvalidAccountRoleException(account.id, AccountRole.ADMIN))

    @pytest.mark.asyncio
    async def test_create_student_duplicate_account(self):
        """Test creating a student when account already has a student record."""
        student = await self.student_utils.create_one()
        payload = await self.student_utils.next_student_create(account_id=student.account_id)

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        assert_res_failure(response, StudentAlreadyExistsException(student.account_id))

    @pytest.mark.asyncio
    async def test_create_student_duplicate_phone(self):
        """Test creating students with duplicate phone numbers."""
        student = await self.student_utils.create_one()
        payload = await self.student_utils.next_student_create(phone_number=student.phone_number)

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        assert_res_failure(response, StudentConflictException(student.phone_number))

    @pytest.mark.asyncio
    async def test_create_student_with_residence(
        self, gmaps_utils: GmapsMockUtils, location_utils: LocationTestUtils
    ):
        """Test admin creating a student with a residence."""
        location = await location_utils.create_one()
        gmaps_utils.mock_place_details(
            google_place_id=location.google_place_id,
            formatted_address=location.formatted_address,
            latitude=float(location.latitude),
            longitude=float(location.longitude),
        )

        payload = await self.student_utils.next_student_create(
            last_registered=datetime.now(UTC),
            residence_place_id=location.google_place_id,
        )

        response = await self.admin_client.post(
            "/api/students", json=payload.model_dump(mode="json")
        )
        data = assert_res_success(response, StudentDto, status=201)

        assert data.residence is not None
        assert data.residence.location.id == location.id
        assert data.residence.residence_chosen_date is not None

    @pytest.mark.asyncio
    async def test_get_student_success(self):
        """Test successfully getting a student by ID."""
        student = await self.student_utils.create_one()

        response = await self.admin_client.get(f"/api/students/{student.account_id}")
        data = assert_res_success(response, StudentDto)

        self.student_utils.assert_matches(student, data)

    @pytest.mark.asyncio
    async def test_get_student_not_found(self):
        """Test getting a non-existent student."""
        response = await self.admin_client.get("/api/students/999")
        assert_res_failure(response, StudentNotFoundException(999))

    @pytest.mark.asyncio
    async def test_update_student_success(self):
        """Test successfully updating a student."""
        student = await self.student_utils.create_one()
        updated_data = await self.student_utils.next_data_with_names()

        response = await self.admin_client.put(
            f"/api/students/{student.account_id}",
            json=updated_data.model_dump(mode="json"),
        )
        data = assert_res_success(response, StudentDto)

        self.student_utils.assert_matches(updated_data, data)
        assert data.id == student.account_id

    @pytest.mark.asyncio
    async def test_update_student_not_found(self):
        """Test updating a non-existent student."""
        updated_data = await self.student_utils.next_data_with_names()

        response = await self.admin_client.put(
            "/api/students/99999",
            json=updated_data.model_dump(mode="json"),
        )
        assert_res_failure(response, StudentNotFoundException(99999))

    @pytest.mark.asyncio
    async def test_update_student_phone_conflict(self):
        """Test updating student with phone number that already exists."""
        students = await self.student_utils.create_many(i=2)
        updated_data = await self.student_utils.next_data_with_names(
            phone_number=students[0].phone_number
        )

        response = await self.admin_client.put(
            f"/api/students/{students[1].account_id}",
            json=updated_data.model_dump(mode="json"),
        )
        assert_res_failure(response, StudentConflictException(students[0].phone_number))

    @pytest.mark.asyncio
    async def test_delete_student_success(self):
        """Test successfully deleting a student."""
        student = await self.student_utils.create_one()

        response = await self.admin_client.delete(f"/api/students/{student.account_id}")
        data = assert_res_success(response, StudentDto)

        self.student_utils.assert_matches(student, data)

        # Verify deletion
        get_response = await self.admin_client.get(f"/api/students/{student.account_id}")
        assert_res_failure(get_response, StudentNotFoundException(student.account_id))

    @pytest.mark.asyncio
    async def test_delete_student_not_found(self):
        """Test deleting a non-existent student."""
        response = await self.admin_client.delete("/api/students/99999")
        assert_res_failure(response, StudentNotFoundException(99999))


class TestStudentRegistrationRouter:
    """Tests for PATCH /api/students/{id}/is-registered endpoint."""

    staff_client: AsyncClient
    admin_client: AsyncClient
    student_utils: StudentTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        student_utils: StudentTestUtils,
        staff_client: AsyncClient,
        admin_client: AsyncClient,
    ):
        self.student_utils = student_utils
        self.staff_client = staff_client
        self.admin_client = admin_client

    @pytest.mark.asyncio
    async def test_update_is_registered_mark_as_registered_as_staff(self):
        """Test marking a student as registered (staff authentication)."""
        student = await self.student_utils.create_one(last_registered=None)

        payload = {"is_registered": True}
        response = await self.staff_client.patch(
            f"/api/students/{student.account_id}/is-registered",
            json=payload,
        )
        data = assert_res_success(response, StudentDto)

        assert data.id == student.account_id
        assert data.last_registered is not None

    @pytest.mark.asyncio
    async def test_update_is_registered_mark_as_not_registered_as_admin(self):
        """Test unmarking a student as registered (admin authentication)."""
        student = await self.student_utils.create_one(last_registered=datetime.now(UTC))

        payload = {"is_registered": False}
        response = await self.admin_client.patch(
            f"/api/students/{student.account_id}/is-registered",
            json=payload,
        )
        data = assert_res_success(response, StudentDto)

        assert data.id == student.account_id
        assert data.last_registered is None

    @pytest.mark.asyncio
    async def test_update_is_registered_student_not_found(self):
        """Test updating is_registered for non-existent student."""
        payload = {"is_registered": True}
        response = await self.staff_client.patch("/api/students/999/is-registered", json=payload)
        assert_res_failure(response, StudentNotFoundException(999))

    @pytest.mark.asyncio
    async def test_update_is_registered_toggle(self):
        """Test toggling is_registered from False to True and back."""
        student = await self.student_utils.create_one(last_registered=None)

        # Mark as registered
        response = await self.staff_client.patch(
            f"/api/students/{student.account_id}/is-registered",
            json={"is_registered": True},
        )
        data = assert_res_success(response, StudentDto)
        assert data.last_registered is not None
        first_registered_time = data.last_registered

        # Unmark as registered
        response = await self.staff_client.patch(
            f"/api/students/{student.account_id}/is-registered",
            json={"is_registered": False},
        )
        data = assert_res_success(response, StudentDto)
        assert data.last_registered is None

        # Mark as registered again
        response = await self.staff_client.patch(
            f"/api/students/{student.account_id}/is-registered",
            json={"is_registered": True},
        )
        data = assert_res_success(response, StudentDto)
        assert data.last_registered is not None
        assert data.last_registered != first_registered_time


class TestStudentMeRouter:
    """Tests for /api/students/me endpoints (student-only routes)."""

    student_client: AsyncClient
    student_utils: StudentTestUtils
    account_utils: AccountTestUtils
    party_utils: PartyTestUtils

    @pytest_asyncio.fixture
    async def current_student(self) -> StudentEntity:
        """Create a student for the current authenticated user.

        Note: student_client authenticates as user with id=3 (from mock_authenticate in
        authentication.py) so we need to ensure the account has id=3.
        """
        # The student_client from conftest uses id=3 for students in mock_authenticate
        # We need to create dummy accounts for IDs 1 and 2 first
        await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        await self.account_utils.create_one(role=AccountRole.STAFF.value)

        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        # Verify we got ID 3
        assert account.id == 3, f"Expected account.id=3, got {account.id}"

        student = await self.student_utils.create_one(account_id=account.id)
        return student

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        student_utils: StudentTestUtils,
        account_utils: AccountTestUtils,
        party_utils: PartyTestUtils,
        student_client: AsyncClient,
    ):
        self.student_utils = student_utils
        self.account_utils = account_utils
        self.party_utils = party_utils
        self.student_client = student_client

    @pytest.mark.asyncio
    async def test_get_me_success(self, current_student: StudentEntity):
        """Test getting current student's own information."""
        response = await self.student_client.get("/api/students/me")
        data = assert_res_success(response, StudentDto)

        self.student_utils.assert_matches(current_student, data)

    @pytest.mark.asyncio
    async def test_get_me_not_found(self):
        """Test get me when student record doesn't exist (but account with id=3 does)."""
        # Create dummy accounts for IDs 1 and 2 to ensure next account gets ID 3
        await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        await self.account_utils.create_one(role=AccountRole.STAFF.value)

        # Create account with ID 3 but no student record
        await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        response = await self.student_client.get("/api/students/me")
        assert_res_failure(response, StudentNotFoundException(3))

    @pytest.mark.asyncio
    async def test_update_me_success(self, current_student: StudentEntity):
        """Test updating current student's own information."""
        updated_data = await self.student_utils.next_data()

        response = await self.student_client.put(
            "/api/students/me",
            json=updated_data.model_dump(mode="json"),
        )
        data = assert_res_success(response, StudentDto)

        self.student_utils.assert_matches(updated_data, data)
        # Names should not change via /me endpoint (only StudentData, not StudentDataWithNames)
        assert data.id == current_student.account_id

    @pytest.mark.asyncio
    async def test_update_me_phone_conflict(self, current_student: StudentEntity):
        """Test updating me with phone number that already exists."""
        other_student = await self.student_utils.create_one()
        updated_data = StudentData(
            contact_preference=ContactPreference.TEXT,
            phone_number=other_student.phone_number,
        )

        response = await self.student_client.put(
            "/api/students/me",
            json=updated_data.model_dump(mode="json"),
        )
        assert_res_failure(response, StudentConflictException(other_student.phone_number))

    @pytest.mark.asyncio
    async def test_get_me_parties_empty(self, current_student: StudentEntity):
        """Test getting parties when student has no parties."""
        response = await self.student_client.get("/api/students/me/parties")
        assert response.status_code == 200
        data = response.json()
        assert data == []

    @pytest.mark.asyncio
    async def test_get_me_parties_with_data(self, current_student: StudentEntity):
        """Test getting parties when student has parties."""
        # Create another student
        other_student = await self.student_utils.create_one()

        # Create a party where current_student is contact_one
        party1 = await self.party_utils.create_one(
            party_datetime=datetime(2024, 12, 1, 20, 0, 0, tzinfo=UTC),
            contact_one_id=current_student.account_id,
        )

        # Create a party where other_student is contact_one (should not be returned)
        party2 = await self.party_utils.create_one(
            party_datetime=datetime(2024, 12, 15, 21, 0, 0, tzinfo=UTC),
            contact_one_id=other_student.account_id,
        )

        response = await self.student_client.get("/api/students/me/parties")

        parties = assert_res_success(response, list[PartyDto])
        assert len(parties) == 1
        assert party2.id not in [p.id for p in parties]
        self.party_utils.assert_matches(parties[0], party1)


class TestStudentResidenceRouter:
    """Tests for /api/students/me/residence endpoint."""

    student_client: AsyncClient
    student_utils: StudentTestUtils
    account_utils: AccountTestUtils
    location_utils: LocationTestUtils
    gmaps_utils: GmapsMockUtils

    @pytest_asyncio.fixture
    async def current_student(self) -> StudentEntity:
        """Create a student for the current authenticated user with last_registered set."""
        # The student_client from conftest uses id=3 for students
        await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        await self.account_utils.create_one(role=AccountRole.STAFF.value)
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        assert account.id == 3

        # Create student with last_registered to allow residence selection
        student = await self.student_utils.create_one(
            account_id=account.id,
            last_registered=datetime.now(UTC),
        )
        return student

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        student_utils: StudentTestUtils,
        account_utils: AccountTestUtils,
        location_utils: LocationTestUtils,
        gmaps_utils: GmapsMockUtils,
        student_client: AsyncClient,
    ):
        self.student_utils = student_utils
        self.account_utils = account_utils
        self.location_utils = location_utils
        self.gmaps_utils = gmaps_utils
        self.student_client = student_client

    @pytest.mark.asyncio
    async def test_update_residence_success(self, current_student: StudentEntity):
        """Test student successfully updating their residence."""
        from src.modules.location.location_model import LocationDto

        location = await self.location_utils.create_one()
        self.gmaps_utils.mock_place_details(
            google_place_id=location.google_place_id,
            formatted_address=location.formatted_address,
            latitude=float(location.latitude),
            longitude=float(location.longitude),
        )

        payload = {"residence_place_id": location.google_place_id}
        response = await self.student_client.put("/api/students/me/residence", json=payload)
        data = assert_res_success(response, LocationDto)

        assert data.id == location.id

    @pytest.mark.asyncio
    async def test_update_residence_without_party_smart(self):
        """Test that unregistered student cannot choose residence."""
        from src.core.exceptions import BadRequestException

        # Create student without last_registered
        await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        await self.account_utils.create_one(role=AccountRole.STAFF.value)
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)
        await self.student_utils.create_one(
            account_id=account.id,
            last_registered=None,
        )

        location = await self.location_utils.create_one()
        payload = {"residence_place_id": location.google_place_id}

        response = await self.student_client.put("/api/students/me/residence", json=payload)
        assert_res_failure(
            response,
            BadRequestException("Must complete Party Smart before choosing a residence"),
        )

    @pytest.mark.asyncio
    async def test_update_residence_same_academic_year(self, current_student: StudentEntity):
        """Test that student cannot change residence in same academic year."""
        from src.modules.student.student_service import ResidenceAlreadyChosenException

        # Set initial residence
        location1 = await self.location_utils.create_one()
        current_student.residence_id = location1.id
        current_student.residence_chosen_date = datetime.now(UTC)
        self.student_utils.session.add(current_student)
        await self.student_utils.session.commit()

        # Try to change residence in same academic year
        location2 = await self.location_utils.create_one()
        self.gmaps_utils.mock_place_details(
            google_place_id=location2.google_place_id,
            formatted_address=location2.formatted_address,
            latitude=float(location2.latitude),
            longitude=float(location2.longitude),
        )

        payload = {"residence_place_id": location2.google_place_id}
        response = await self.student_client.put("/api/students/me/residence", json=payload)
        assert_res_failure(response, ResidenceAlreadyChosenException())

    @pytest.mark.asyncio
    async def test_update_residence_new_academic_year(self):
        """Test that student can change residence in a new academic year."""
        from src.modules.location.location_model import LocationDto

        # Create student with old residence from previous academic year
        now = datetime.now(UTC)
        if now.month >= 8:
            old_date = datetime(now.year - 1, 8, 2, tzinfo=UTC)
        else:
            old_date = datetime(now.year - 2, 8, 2, tzinfo=UTC)

        await self.account_utils.create_one(role=AccountRole.ADMIN.value)
        await self.account_utils.create_one(role=AccountRole.STAFF.value)
        account = await self.account_utils.create_one(role=AccountRole.STUDENT.value)

        location1 = await self.location_utils.create_one()
        student = await self.student_utils.create_one(
            account_id=account.id,
            last_registered=old_date,
        )
        student.residence_id = location1.id
        student.residence_chosen_date = old_date
        self.student_utils.session.add(student)
        await self.student_utils.session.commit()

        # Should be able to change residence in new academic year
        location2 = await self.location_utils.create_one()
        self.gmaps_utils.mock_place_details()

        payload = {"residence_place_id": location2.google_place_id}
        response = await self.student_client.put("/api/students/me/residence", json=payload)
        data = assert_res_success(response, LocationDto)
        assert data.id == location2.id
