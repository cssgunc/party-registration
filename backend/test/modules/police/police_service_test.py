from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from src.core.exceptions import (
    BadRequestException,
    CredentialsException,
    ForbiddenException,
)
from src.modules.police.police_model import PoliceAccountDto, PoliceRole
from src.modules.police.police_service import (
    PoliceConflictException,
    PoliceNotFoundException,
    PoliceService,
)
from test.modules.police.police_utils import PoliceTestUtils


class TestPoliceService:
    police_utils: PoliceTestUtils
    police_service: PoliceService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        police_utils: PoliceTestUtils,
        police_service: PoliceService,
    ):
        self.police_utils = police_utils
        self.police_service = police_service

    @pytest.mark.asyncio
    async def test_get_police_by_id_not_found(self) -> None:
        """Test getting police by ID when none exists raises PoliceNotFoundException."""
        with pytest.raises(PoliceNotFoundException):
            await self.police_service.get_police_by_id(99999)

    @pytest.mark.asyncio
    async def test_get_police_by_id_success(self) -> None:
        """Test successfully getting police by ID."""
        police_entity = await self.police_utils.create_one()

        result = await self.police_service.get_police_by_id(police_entity.id)

        assert isinstance(result, PoliceAccountDto)
        self.police_utils.assert_matches(police_entity, result)

    @pytest.mark.asyncio
    async def test_create_multiple_police(self) -> None:
        """Test that multiple police accounts can be created."""
        police1, police2 = await self.police_utils.create_many(i=2)

        assert police1.email != police2.email

    @pytest.mark.asyncio
    async def test_update_police_success(self) -> None:
        """Test successfully updating police credentials."""
        police_entity = await self.police_utils.create_one()

        result = await self.police_service.update_police(
            police_entity.id,
            "updated@unc.edu",
            police_entity.role,
        )

        assert isinstance(result, PoliceAccountDto)
        assert result.id == police_entity.id
        assert result.email == "updated@unc.edu"
        assert result.role == police_entity.role

    @pytest.mark.asyncio
    async def test_update_police_role_success(self) -> None:
        police_entity = await self.police_utils.create_one(role=PoliceRole.OFFICER)
        result = await self.police_service.update_police(
            police_entity.id,
            police_entity.email,
            PoliceRole.POLICE_ADMIN,
        )
        assert result.role == PoliceRole.POLICE_ADMIN

    @pytest.mark.asyncio
    async def test_update_police_not_found(self) -> None:
        """Test updating non-existent police raises PoliceNotFoundException."""
        data = await self.police_utils.next_update_data()
        with pytest.raises(PoliceNotFoundException):
            await self.police_service.update_police(
                99999,
                "updated@unc.edu",
                data.role,
            )

    @pytest.mark.asyncio
    async def test_update_police_duplicate_email(self) -> None:
        """Test that updating to a duplicate email raises PoliceConflictException."""
        police1 = await self.police_utils.create_one()
        police2 = await self.police_utils.create_one()

        with pytest.raises(PoliceConflictException):
            await self.police_service.update_police(
                police1.id,
                police2.email,
                police1.role,
            )

    @pytest.mark.asyncio
    async def test_update_police_does_not_change_password(self) -> None:
        police_entity = await self.police_utils.create_one()
        original_hashed_password = police_entity.hashed_password

        await self.police_service.update_police(
            police_entity.id,
            "updated-no-password@unc.edu",
            police_entity.role,
        )

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == police_entity.id)
        assert updated.hashed_password == original_hashed_password

    @pytest.mark.asyncio
    async def test_update_police_is_verified(self) -> None:
        """Test that is_verified can be updated by admin."""
        police_entity = await self.police_utils.create_one()
        assert not police_entity.is_verified

        result = await self.police_service.update_police(
            police_entity.id,
            police_entity.email,
            police_entity.role,
            is_verified=True,
        )

        assert result.is_verified

    @pytest.mark.asyncio
    async def test_delete_police_success(self) -> None:
        """Test successfully deleting a police account."""
        police_entity = await self.police_utils.create_one()

        result = await self.police_service.delete_police(police_entity.id)

        assert isinstance(result, PoliceAccountDto)
        self.police_utils.assert_matches(police_entity, result)

        with pytest.raises(PoliceNotFoundException):
            await self.police_service.get_police_by_id(police_entity.id)

    @pytest.mark.asyncio
    async def test_delete_police_not_found(self) -> None:
        """Test deleting non-existent police raises PoliceNotFoundException."""
        with pytest.raises(PoliceNotFoundException):
            await self.police_service.delete_police(99999)

    @pytest.mark.asyncio
    async def test_verify_police_credentials_success(self) -> None:
        """Test successfully verifying valid credentials for a verified officer."""
        police_entity = await self.police_utils.create_verified_one()

        result = await self.police_service.verify_police_credentials(
            police_entity.email, self.police_utils.TEST_PASSWORD
        )

        assert isinstance(result, PoliceAccountDto)
        self.police_utils.assert_matches(police_entity, result)

    @pytest.mark.asyncio
    async def test_verify_police_credentials_not_verified(self) -> None:
        """Test that unverified police cannot login."""
        police_entity = await self.police_utils.create_one()

        with pytest.raises(ForbiddenException) as exc_info:
            await self.police_service.verify_police_credentials(
                police_entity.email, self.police_utils.TEST_PASSWORD
            )

        assert exc_info.value.detail == "EMAIL_NOT_VERIFIED"

    @pytest.mark.asyncio
    async def test_verify_police_credentials_wrong_email(self) -> None:
        """Test verifying credentials with wrong email raises CredentialsException."""
        await self.police_utils.create_one()

        with pytest.raises(CredentialsException):
            await self.police_service.verify_police_credentials(
                "wrong@unc.edu", self.police_utils.TEST_PASSWORD
            )

    @pytest.mark.asyncio
    async def test_verify_police_credentials_wrong_password(self) -> None:
        """Test verifying credentials with wrong password raises CredentialsException."""
        police_entity = await self.police_utils.create_one()

        with pytest.raises(CredentialsException):
            await self.police_service.verify_police_credentials(
                police_entity.email, "wrongpassword"
            )

    @pytest.mark.asyncio
    async def test_verify_police_credentials_not_found(self) -> None:
        """Test verifying credentials when police not found raises CredentialsException."""
        with pytest.raises(CredentialsException):
            await self.police_service.verify_police_credentials("police@unc.edu", "password")

    @pytest.mark.asyncio
    async def test_verify_police_credentials_wildcard_email(self) -> None:
        """Test that % and _ wildcards in email don't cause MultipleResultsFound."""
        await self.police_utils.create_many(i=3)

        with pytest.raises(CredentialsException):
            await self.police_service.verify_police_credentials(
                "%@unc.edu", self.police_utils.TEST_PASSWORD
            )

        with pytest.raises(CredentialsException):
            await self.police_service.verify_police_credentials(
                "_@unc.edu", self.police_utils.TEST_PASSWORD
            )


class TestPoliceSignup:
    police_utils: PoliceTestUtils
    police_service: PoliceService

    @pytest.fixture(autouse=True)
    def _setup(self, police_utils: PoliceTestUtils, police_service: PoliceService):
        self.police_utils = police_utils
        self.police_service = police_service

    @pytest.mark.asyncio
    async def test_signup_creates_unverified_record(self) -> None:
        """Test signup creates an unverified record with a token set."""
        data = await self.police_utils.next_data()

        await self.police_service.signup_police(data.email, data.password)

        all_police = await self.police_utils.get_all()
        created = next(p for p in all_police if p.email == data.email)
        self.police_utils.assert_unverified(created)

    @pytest.mark.asyncio
    async def test_signup_sends_email(self, mock_email_service: AsyncMock) -> None:
        """Test signup sends a verification email."""
        data = await self.police_utils.next_data()

        await self.police_service.signup_police(data.email, data.password)

        mock_email_service.send_email.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_signup_duplicate_email_raises_conflict(self) -> None:
        """Test signing up with an existing email raises PoliceConflictException."""
        existing = await self.police_utils.create_one()

        with pytest.raises(PoliceConflictException):
            await self.police_service.signup_police(existing.email, "somepassword")

    @pytest.mark.asyncio
    async def test_signup_duplicate_email_does_not_send_email(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Test that a failed signup does not send an email."""
        existing = await self.police_utils.create_one()

        with pytest.raises(PoliceConflictException):
            await self.police_service.signup_police(existing.email, "somepassword")

        mock_email_service.send_email.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_signup_assigns_officer_role(self) -> None:
        """Test that self-signup always creates an officer, never a police_admin."""
        data = await self.police_utils.next_data()

        await self.police_service.signup_police(data.email, data.password)

        all_police = await self.police_utils.get_all()
        created = next(p for p in all_police if p.email == data.email)
        assert created.role == PoliceRole.OFFICER


class TestPoliceEmailVerification:
    police_utils: PoliceTestUtils
    police_service: PoliceService

    @pytest.fixture(autouse=True)
    def _setup(self, police_utils: PoliceTestUtils, police_service: PoliceService):
        self.police_utils = police_utils
        self.police_service = police_service

    @pytest.mark.asyncio
    async def test_verify_success(self) -> None:
        """Test successful email verification clears the token and marks as verified."""
        entity = await self.police_utils.create_with_token()

        await self.police_service.verify_police_email(entity.verification_token)  # type: ignore[arg-type]

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        self.police_utils.assert_verified(updated)

    @pytest.mark.asyncio
    async def test_verify_invalid_token(self) -> None:
        """Test verification with a token that doesn't match any account."""
        with pytest.raises(BadRequestException):
            await self.police_service.verify_police_email("not_a_real_token")

    @pytest.mark.asyncio
    async def test_verify_expired_token(self) -> None:
        """Test verification with an expired token."""
        entity = await self.police_utils.create_with_token(
            expires_at=datetime.now(UTC) - timedelta(hours=1)
        )

        with pytest.raises(BadRequestException):
            await self.police_service.verify_police_email(entity.verification_token)  # type: ignore[arg-type]

    @pytest.mark.asyncio
    async def test_verify_token_is_single_use(self) -> None:
        """Test that a token cannot be used a second time after successful verification."""
        entity = await self.police_utils.create_with_token()
        token = entity.verification_token

        await self.police_service.verify_police_email(token)  # type: ignore[arg-type]

        with pytest.raises(BadRequestException):
            await self.police_service.verify_police_email(token)  # type: ignore[arg-type]


class TestPoliceRetryVerification:
    police_utils: PoliceTestUtils
    police_service: PoliceService

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        police_utils: PoliceTestUtils,
        police_service: PoliceService,
    ):
        self.police_utils = police_utils
        self.police_service = police_service

    @pytest.mark.asyncio
    async def test_retry_verification_success_refreshes_token_and_expiry(
        self,
        mock_email_service: AsyncMock,
    ) -> None:
        """Retry should generate a fresh verification token and send a new email."""
        entity = await self.police_utils.create_with_token(
            token="old_verification_token",
            expires_at=datetime.now(UTC) + timedelta(minutes=30),
        )
        original_token = entity.verification_token
        original_expiry = entity.verification_token_expires_at

        await self.police_service.retry_verification(entity.email)

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        self.police_utils.assert_unverified(updated)
        assert updated.verification_token != original_token
        assert updated.verification_token_expires_at is not None
        assert original_expiry is not None
        assert updated.verification_token_expires_at > original_expiry
        mock_email_service.send_email.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_retry_verification_missing_email_is_no_op(
        self,
        mock_email_service: AsyncMock,
    ) -> None:
        """Retrying with an unknown email should fail and not send email."""
        await self.police_service.retry_verification("missing@unc.edu")

        mock_email_service.send_email.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_retry_verification_verified_account_is_no_op(
        self,
        mock_email_service: AsyncMock,
    ) -> None:
        """Verified accounts should not receive another verification email."""
        entity = await self.police_utils.create_verified_one()

        await self.police_service.retry_verification(entity.email)

        mock_email_service.send_email.assert_not_awaited()
