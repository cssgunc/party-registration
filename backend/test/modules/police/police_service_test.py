from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import (
    BadRequestException,
    CredentialsException,
    ForbiddenException,
)
from src.core.utils.bcrypt_utils import verify_password
from src.modules.auth.refresh_token_entity import RefreshTokenEntity
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
    async def test_signup_duplicate_verified_email_raises_conflict(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Test signing up with an already-verified email raises PoliceConflictException."""
        existing = await self.police_utils.create_verified_one()

        with pytest.raises(PoliceConflictException):
            await self.police_service.signup_police(existing.email, "somepassword")

        mock_email_service.send_email.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_signup_duplicate_unverified_email_resends_verification(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Re-signing up with an unverified email should resend verification, not raise."""
        existing = await self.police_utils.create_one()

        await self.police_service.signup_police(existing.email, self.police_utils.TEST_PASSWORD)

        mock_email_service.send_email.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_signup_duplicate_unverified_email_refreshes_token(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Re-signing up with an unverified email should issue a fresh verification token."""
        existing = await self.police_utils.create_with_token(token="old_token")

        await self.police_service.signup_police(existing.email, self.police_utils.TEST_PASSWORD)

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == existing.id)
        self.police_utils.assert_unverified(updated)
        assert updated.verification_token != "old_token"

    @pytest.mark.asyncio
    async def test_signup_duplicate_unverified_email_updates_password(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Re-signing up with an unverified email should update the stored password."""
        existing = await self.police_utils.create_one()
        original_hash = existing.hashed_password

        await self.police_service.signup_police(existing.email, "brand_new_password")

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == existing.id)
        assert updated.hashed_password != original_hash

    @pytest.mark.asyncio
    async def test_signup_restricts_to_chpd_domain(self, mock_email_service: AsyncMock) -> None:
        """Test signing up with an existing email raises PoliceConflictException."""
        data = await self.police_utils.next_data(email="test@notchpd.com")

        with pytest.raises(BadRequestException):
            await self.police_service.signup_police(data.email, data.password)

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


class TestPoliceRequestPasswordReset:
    police_utils: PoliceTestUtils
    police_service: PoliceService

    @pytest.fixture(autouse=True)
    def _setup(self, police_utils: PoliceTestUtils, police_service: PoliceService):
        self.police_utils = police_utils
        self.police_service = police_service

    @pytest.mark.asyncio
    async def test_request_password_reset_sends_email_for_valid_account(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Verified police accounts receive a password reset email with a token set."""
        entity = await self.police_utils.create_verified_one()

        await self.police_service.request_password_reset(entity.email)

        mock_email_service.send_email.assert_awaited_once()
        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        assert updated.password_reset_token is not None, "Expected password_reset_token to be set"
        assert updated.password_reset_token_expires_at is not None, (
            "Expected password_reset_token_expires_at to be set"
        )

    @pytest.mark.asyncio
    async def test_request_password_reset_unknown_email_is_no_op(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Unknown email silently succeeds without sending an email (anti-enumeration)."""
        await self.police_service.request_password_reset("unknown@chapelhillnc.gov")

        mock_email_service.send_email.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_request_password_reset_unverified_account_is_no_op(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Unverified accounts do not receive a reset email."""
        entity = await self.police_utils.create_one()

        await self.police_service.request_password_reset(entity.email)

        mock_email_service.send_email.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_request_password_reset_overwrites_existing_token(
        self, mock_email_service: AsyncMock
    ) -> None:
        """Calling request twice replaces the previous reset token."""
        entity = await self.police_utils.create_with_reset_token(token="first_token")

        await self.police_service.request_password_reset(entity.email)

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        assert updated.password_reset_token != "first_token", "Expected old token to be replaced"
        mock_email_service.send_email.assert_awaited_once()


class TestPoliceResetPassword:
    police_utils: PoliceTestUtils
    police_service: PoliceService
    test_session: AsyncSession

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        police_utils: PoliceTestUtils,
        police_service: PoliceService,
        test_session: AsyncSession,
    ):
        self.police_utils = police_utils
        self.police_service = police_service
        self.test_session = test_session

    async def _count_refresh_tokens(self, police_id: int) -> int:
        result = await self.test_session.execute(
            select(RefreshTokenEntity).where(RefreshTokenEntity.police_id == police_id)
        )
        return len(result.scalars().all())

    async def _create_refresh_token(self, police_id: int) -> RefreshTokenEntity:
        token = RefreshTokenEntity(token_hash=f"testhash_{police_id}", police_id=police_id)
        self.test_session.add(token)
        await self.test_session.commit()
        return token

    @pytest.mark.asyncio
    async def test_reset_password_valid_token_updates_password(self) -> None:
        """Valid reset token changes the hashed password."""
        entity = await self.police_utils.create_with_reset_token()
        old_hash = entity.hashed_password
        new_password = "new_secure_password"

        await self.police_service.reset_password(entity.password_reset_token, new_password)  # type: ignore[arg-type]

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        assert updated.hashed_password != old_hash, "Expected hashed_password to change"
        assert verify_password(new_password, updated.hashed_password), (
            "New password should verify against new hash"
        )

    @pytest.mark.asyncio
    async def test_reset_password_valid_token_clears_token(self) -> None:
        """Valid reset token is cleared after use."""
        entity = await self.police_utils.create_with_reset_token()

        await self.police_service.reset_password(entity.password_reset_token, "newpassword1")  # type: ignore[arg-type]

        all_police = await self.police_utils.get_all()
        updated = next(p for p in all_police if p.id == entity.id)
        self.police_utils.assert_password_reset_token_cleared(updated)

    @pytest.mark.asyncio
    async def test_reset_password_valid_token_revokes_refresh_tokens(self) -> None:
        """All existing sessions (refresh tokens) are invalidated on password reset."""
        entity = await self.police_utils.create_with_reset_token()
        await self._create_refresh_token(entity.id)
        assert await self._count_refresh_tokens(entity.id) == 1

        await self.police_service.reset_password(entity.password_reset_token, "newpassword1")  # type: ignore[arg-type]

        assert await self._count_refresh_tokens(entity.id) == 0, (
            "Expected all refresh tokens to be revoked"
        )

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token_raises(self) -> None:
        """Non-existent token raises CredentialsException."""
        with pytest.raises(CredentialsException):
            await self.police_service.reset_password("not_a_real_token", "newpassword1")

    @pytest.mark.asyncio
    async def test_reset_password_expired_token_raises(self) -> None:
        """Expired token raises CredentialsException."""
        entity = await self.police_utils.create_with_reset_token(
            expires_at=datetime.now(UTC) - timedelta(hours=1)
        )

        with pytest.raises(CredentialsException):
            await self.police_service.reset_password(entity.password_reset_token, "newpassword1")  # type: ignore[arg-type]

    @pytest.mark.asyncio
    async def test_reset_password_token_cannot_be_reused(self) -> None:
        """A reset token cannot be used a second time."""
        entity = await self.police_utils.create_with_reset_token()
        token = entity.password_reset_token

        await self.police_service.reset_password(token, "newpassword1")  # type: ignore[arg-type]

        with pytest.raises(CredentialsException):
            await self.police_service.reset_password(token, "anotherpassword")  # type: ignore[arg-type]
