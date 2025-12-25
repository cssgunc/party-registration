import pytest
from src.core.exceptions import CredentialsException
from src.modules.police.police_service import PoliceNotFoundException, PoliceService
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
    async def test_get_police_not_found(self) -> None:
        """Test getting police when none exists raises PoliceNotFoundException."""
        with pytest.raises(PoliceNotFoundException):
            await self.police_service.get_police()

    @pytest.mark.asyncio
    async def test_get_police_success(self) -> None:
        """Test successfully getting police credentials."""
        police_entity = await self.police_utils.create_one()

        fetched = await self.police_service.get_police()

        self.police_utils.assert_matches(fetched, police_entity)

    @pytest.mark.asyncio
    async def test_update_police_success(self) -> None:
        """Test successfully updating police credentials."""
        police_entity = await self.police_utils.create_one()

        update_data = await self.police_utils.next_data(
            email="updated@unc.edu", password="newpassword"
        )

        updated = await self.police_service.update_police(update_data.email, update_data.password)

        assert updated.id == police_entity.id
        # Verify the new password works
        assert self.police_utils.verify_password(update_data.password, updated.hashed_password)
        # Verify the old password no longer works
        assert not self.police_utils.verify_password(
            self.police_utils.TEST_PASSWORD, updated.hashed_password
        )

    @pytest.mark.asyncio
    async def test_update_police_not_found(self) -> None:
        """Test updating police when none exists raises PoliceNotFoundException."""
        update_data = await self.police_utils.next_data()

        with pytest.raises(PoliceNotFoundException):
            await self.police_service.update_police(update_data.email, update_data.password)

    @pytest.mark.asyncio
    async def test_verify_police_credentials_success(self) -> None:
        """Test successfully verifying valid police credentials."""
        police_entity = await self.police_utils.create_one()

        verified = await self.police_service.verify_police_credentials(
            police_entity.email, self.police_utils.TEST_PASSWORD
        )

        self.police_utils.assert_matches(verified, police_entity)

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
        """Test verifying credentials when police not found raises PoliceNotFoundException."""
        with pytest.raises(PoliceNotFoundException):
            await self.police_service.verify_police_credentials("police@unc.edu", "password")
