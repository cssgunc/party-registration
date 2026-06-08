from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.utils.email_utils import EmailService
from src.modules.notification.notification_service import (
    NotificationService,
    UnsubscribeTokenInvalidException,
)

from test.modules.party.party_utils import PartyTestUtils


class TestTokenRoundtrip:
    notification_service: NotificationService

    @pytest.fixture(autouse=True)
    def _setup(self, notification_service: NotificationService):
        self.notification_service = notification_service

    def test_valid_token_decodes_to_original_email(self):
        email = "student@unc.edu"
        token = self.notification_service._make_token(email)
        decoded = self.notification_service.decode_token(token)
        assert decoded == email

    def test_token_is_case_insensitive_on_email(self):
        token = self.notification_service._make_token("Student@UNC.EDU")
        decoded = self.notification_service.decode_token(token)
        assert decoded == "student@unc.edu"

    def test_tampered_signature_raises(self):
        token = self.notification_service._make_token("student@unc.edu")
        email_b64, _ = token.split(".", 1)
        bad_token = f"{email_b64}.{'a' * 64}"
        with pytest.raises(UnsubscribeTokenInvalidException):
            self.notification_service.decode_token(bad_token)

    def test_malformed_token_without_dot_raises(self):
        with pytest.raises(UnsubscribeTokenInvalidException):
            self.notification_service.decode_token("notavalidtoken")

    def test_malformed_base64_raises(self):
        with pytest.raises(UnsubscribeTokenInvalidException):
            self.notification_service.decode_token("!!!.abc")


class TestUnsubscribeList:
    notification_service: NotificationService
    session: AsyncSession

    @pytest.fixture(autouse=True)
    def _setup(self, notification_service: NotificationService, test_session: AsyncSession):
        self.notification_service = notification_service
        self.session = test_session

    @pytest.mark.asyncio
    async def test_is_unsubscribed_returns_false_for_new_email(self):
        result = await self.notification_service.is_unsubscribed("new@unc.edu")
        assert result is False

    @pytest.mark.asyncio
    async def test_unsubscribe_marks_email(self):
        await self.notification_service.unsubscribe("opt-out@unc.edu")
        assert await self.notification_service.is_unsubscribed("opt-out@unc.edu") is True

    @pytest.mark.asyncio
    async def test_unsubscribe_is_case_insensitive(self):
        await self.notification_service.unsubscribe("CaseTest@unc.edu")
        assert await self.notification_service.is_unsubscribed("casetest@unc.edu") is True

    @pytest.mark.asyncio
    async def test_unsubscribe_is_idempotent(self):
        await self.notification_service.unsubscribe("repeat@unc.edu")
        await self.notification_service.unsubscribe("repeat@unc.edu")  # should not raise
        assert await self.notification_service.is_unsubscribed("repeat@unc.edu") is True

    @pytest.mark.asyncio
    async def test_resubscribe_removes_from_list(self):
        await self.notification_service.unsubscribe("resub@unc.edu")
        await self.notification_service.resubscribe("resub@unc.edu")
        assert await self.notification_service.is_unsubscribed("resub@unc.edu") is False

    @pytest.mark.asyncio
    async def test_resubscribe_is_idempotent(self):
        await self.notification_service.resubscribe("never-subbed@unc.edu")  # should not raise
        assert await self.notification_service.is_unsubscribed("never-subbed@unc.edu") is False


class TestNotifyPartyCreated:
    notification_service: NotificationService
    mock_send_email: AsyncMock
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        notification_service: NotificationService,
        mock_email_service: EmailService,
        party_utils: PartyTestUtils,
    ):
        self.notification_service = notification_service
        self.mock_send_email = mock_email_service.send_email  # type: ignore[assignment]
        self.party_utils = party_utils

    @pytest.mark.asyncio
    async def test_sends_to_both_contacts(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        await self.notification_service.notify_party_created(party_dto)

        sent_to = {call.args[0] for call in self.mock_send_email.call_args_list}
        assert party_dto.contact_one.email in sent_to
        assert party_dto.contact_two.email in sent_to

    @pytest.mark.asyncio
    async def test_skips_unsubscribed_contact_one(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        await self.notification_service.unsubscribe(party_dto.contact_one.email)
        await self.notification_service.notify_party_created(party_dto)

        sent_to = {call.args[0] for call in self.mock_send_email.call_args_list}
        assert party_dto.contact_one.email not in sent_to
        assert party_dto.contact_two.email in sent_to

    @pytest.mark.asyncio
    async def test_skips_unsubscribed_contact_two(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        await self.notification_service.unsubscribe(party_dto.contact_two.email)
        await self.notification_service.notify_party_created(party_dto)

        sent_to = {call.args[0] for call in self.mock_send_email.call_args_list}
        assert party_dto.contact_one.email in sent_to
        assert party_dto.contact_two.email not in sent_to

    @pytest.mark.asyncio
    async def test_email_failure_does_not_raise(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        self.mock_send_email.side_effect = Exception("SMTP down")
        await self.notification_service.notify_party_created(party_dto)


class TestNotifyContactTwoChanged:
    notification_service: NotificationService
    mock_send_email: AsyncMock
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        notification_service: NotificationService,
        mock_email_service: EmailService,
        party_utils: PartyTestUtils,
    ):
        self.notification_service = notification_service
        self.mock_send_email = mock_email_service.send_email  # type: ignore[assignment]
        self.party_utils = party_utils

    @pytest.mark.asyncio
    async def test_sends_only_to_contact_two(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        await self.notification_service.notify_contact_two_changed(party_dto)

        sent_to = {call.args[0] for call in self.mock_send_email.call_args_list}
        assert sent_to == {party_dto.contact_two.email}

    @pytest.mark.asyncio
    async def test_skips_unsubscribed_contact_two(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        await self.notification_service.unsubscribe(party_dto.contact_two.email)
        await self.notification_service.notify_contact_two_changed(party_dto)

        self.mock_send_email.assert_not_called()

    @pytest.mark.asyncio
    async def test_email_failure_does_not_raise(self):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        self.mock_send_email.side_effect = Exception("SMTP down")
        await self.notification_service.notify_contact_two_changed(party_dto)


class TestPartyNotificationEscaping:
    notification_service: NotificationService
    mock_send_email: AsyncMock
    party_utils: PartyTestUtils

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        notification_service: NotificationService,
        mock_email_service: EmailService,
        party_utils: PartyTestUtils,
    ):
        self.notification_service = notification_service
        self.mock_send_email = mock_email_service.send_email  # type: ignore[assignment]
        self.party_utils = party_utils

    @pytest.mark.parametrize(
        ("field_path", "malicious_value"),
        [
            (("contact_two", "first_name"), "<script>alert(1)</script>"),
            (("contact_two", "last_name"), "<img src=x onerror=alert(1)>"),
            (("contact_two", "email"), 'evil<a href="http://evil.com">'),
            (("contact_one", "first_name"), "<b>injected</b>"),
            (("location", "formatted_address"), "123 <script>evil</script> St"),
        ],
    )
    @pytest.mark.asyncio
    async def test_user_fields_are_html_escaped(
        self, field_path: tuple[str, str], malicious_value: str
    ):
        party_entity = await self.party_utils.create_one()
        party_dto = await party_entity.load_dto(self.party_utils.session)

        # Mutate the nested field on the DTO.
        target = getattr(party_dto, field_path[0])
        setattr(target, field_path[1], malicious_value)

        await self.notification_service.notify_party_created(party_dto)

        # Inspect the HTML body of every sent email — none should contain
        # the raw malicious value; only the escaped version should appear.
        for call in self.mock_send_email.call_args_list:
            html_body = call.args[2]
            assert malicious_value not in html_body, (
                f"raw value leaked into email body: {malicious_value}"
            )
