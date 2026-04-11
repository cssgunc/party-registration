import pytest
from src.core.exceptions import CredentialsException
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
    async def test_create_police_success(self) -> None:
        """Test successfully creating a new police account."""
        data = await self.police_utils.next_data()

        result = await self.police_service.create_police(data.email, data.password, data.role)

        assert isinstance(result, PoliceAccountDto)
        assert result.email == data.email
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_create_police_duplicate_email(self) -> None:
        """Test creating a police account with a duplicate email raises PoliceConflictException."""
        police_entity = await self.police_utils.create_one()

        with pytest.raises(PoliceConflictException):
            await self.police_service.create_police(
                police_entity.email,
                "newpassword",
                police_entity.role,
            )

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
            "newpassword",
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
            "newpassword",
            PoliceRole.POLICE_ADMIN,
        )
        assert result.role == PoliceRole.POLICE_ADMIN

    @pytest.mark.asyncio
    async def test_update_police_not_found(self) -> None:
        """Test updating non-existent police raises PoliceNotFoundException."""
        data = await self.police_utils.next_data()
        with pytest.raises(PoliceNotFoundException):
            await self.police_service.update_police(
                99999,
                "updated@unc.edu",
                "newpassword",
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
                "newpassword",
                police1.role,
            )

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
        """Test successfully verifying valid police credentials."""
        police_entity = await self.police_utils.create_one()

        result = await self.police_service.verify_police_credentials(
            police_entity.email, self.police_utils.TEST_PASSWORD
        )

        assert isinstance(result, PoliceAccountDto)
        self.police_utils.assert_matches(police_entity, result)

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
