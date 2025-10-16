from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from modules.account.account_entity import AccountEntity, AccountRole
from modules.account.account_model import AccountData, AccountRoleEnum
from modules.account.account_service import (
    AccountConflictException,
    AccountNotFoundException,
    AccountService,
)


@pytest.fixture
def mock_session():
    """Create a mock AsyncSession for testing."""
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def account_service(mock_session):
    """Create an AccountService instance with mocked session."""
    return AccountService(session=mock_session)


@pytest.fixture
def sample_account_data():
    """Sample account data for testing."""
    return AccountData(
        email="test@example.com",
        password="testpassword123",
        role=AccountRoleEnum.STUDENT,
    )


@pytest.fixture
def sample_account_entity():
    """Sample account entity for testing."""
    return AccountEntity(
        id=1,
        email="test@example.com",
        hashed_password="$2b$12$hashedpassword",
        role=AccountRole.STUDENT,
    )


class TestAccountService:
    """Test suite for AccountService."""

    def test_hash_password(self, account_service):
        """Test password hashing functionality."""
        password = "testpassword123"
        hashed = account_service._hash_password(password)

        # Hash should be different from original password
        assert hashed != password
        # Hash should be a string
        assert isinstance(hashed, str)
        # Hash should start with bcrypt identifier
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self, account_service):
        """Test password verification with correct password."""
        password = "testpassword123"
        hashed = account_service._hash_password(password)

        assert account_service._verify_password(password, hashed) is True

    def test_verify_password_incorrect(self, account_service):
        """Test password verification with incorrect password."""
        password = "testpassword123"
        wrong_password = "wrongpassword"
        hashed = account_service._hash_password(password)

        assert account_service._verify_password(wrong_password, hashed) is False

    async def test_get_accounts_success(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test successful retrieval of all accounts."""
        # Mock the database response
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_account_entity]
        mock_session.execute.return_value = mock_result

        accounts = await account_service.get_accounts()

        assert len(accounts) == 1
        assert accounts[0].id == 1
        assert accounts[0].email == "test@example.com"
        assert accounts[0].role == AccountRoleEnum.STUDENT
        mock_session.execute.assert_called_once()

    async def test_get_account_by_id_success(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test successful retrieval of account by ID."""
        # Mock the database response
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_account_entity
        mock_session.execute.return_value = mock_result

        account = await account_service.get_account_by_id(1)

        assert account.id == 1
        assert account.email == "test@example.com"
        assert account.role == AccountRoleEnum.STUDENT
        mock_session.execute.assert_called_once()

    async def test_get_account_by_id_not_found(self, account_service, mock_session):
        """Test account retrieval by ID when account doesn't exist."""
        # Mock the database response to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        with pytest.raises(AccountNotFoundException):
            await account_service.get_account_by_id(999)

        mock_session.execute.assert_called_once()

    async def test_get_account_by_email_success(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test successful retrieval of account by email."""
        # Mock the database response
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_account_entity
        mock_session.execute.return_value = mock_result

        account = await account_service.get_account_by_email("test@example.com")

        assert account.id == 1
        assert account.email == "test@example.com"
        assert account.role == AccountRoleEnum.STUDENT
        mock_session.execute.assert_called_once()

    async def test_get_account_by_email_not_found(self, account_service, mock_session):
        """Test account retrieval by email when account doesn't exist."""
        # Mock the database response to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        with pytest.raises(AccountNotFoundException):
            await account_service.get_account_by_email("nonexistent@example.com")

        mock_session.execute.assert_called_once()

    async def test_create_account_success(
        self, account_service, mock_session, sample_account_data
    ):
        """Test successful account creation."""
        # Mock the database responses
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # Email doesn't exist
        mock_session.execute.return_value = mock_result

        # Mock the refresh to set the ID on the entity
        mock_session.refresh.side_effect = lambda entity: setattr(entity, "id", 1)

        account = await account_service.create_account(sample_account_data)

        assert account.email == "test@example.com"
        assert account.role == AccountRoleEnum.STUDENT
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()

    async def test_create_account_email_conflict(
        self, account_service, mock_session, sample_account_data, sample_account_entity
    ):
        """Test account creation with existing email."""
        # Mock the database response to return existing account
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_account_entity
        mock_session.execute.return_value = mock_result

        with pytest.raises(AccountConflictException):
            await account_service.create_account(sample_account_data)

        mock_session.add.assert_not_called()
        mock_session.commit.assert_not_called()

    async def test_create_account_integrity_error(
        self, account_service, mock_session, sample_account_data
    ):
        """Test account creation with database integrity error."""
        # Mock the database responses
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = (
            None  # Email doesn't exist initially
        )
        mock_session.execute.return_value = mock_result
        mock_session.commit.side_effect = IntegrityError("", "", "")

        with pytest.raises(AccountConflictException):
            await account_service.create_account(sample_account_data)

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()

    async def test_update_account_success(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test successful account update."""
        # Mock the database responses
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # New email doesn't exist
        mock_session.execute.return_value = mock_result

        # Mock getting the existing account
        def execute_side_effect(query):
            if "WHERE accounts.id" in str(query):
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = sample_account_entity
                return mock_result
            else:  # Email check query
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = None
                return mock_result

        mock_session.execute.side_effect = execute_side_effect

        update_data = AccountData(
            email="updated@example.com",
            password="newpassword123",
            role=AccountRoleEnum.ADMIN,
        )

        account = await account_service.update_account(1, update_data)

        assert account.email == "updated@example.com"
        assert account.role == AccountRoleEnum.ADMIN
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()

    async def test_update_account_not_found(self, account_service, mock_session):
        """Test account update when account doesn't exist."""
        # Mock the database response to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        update_data = AccountData(
            email="updated@example.com",
            password="newpassword123",
            role=AccountRoleEnum.ADMIN,
        )

        with pytest.raises(AccountNotFoundException):
            await account_service.update_account(999, update_data)

    async def test_update_account_email_conflict(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test account update with conflicting email."""

        # Mock the database responses
        def execute_side_effect(query):
            if "WHERE accounts.id" in str(query):
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = sample_account_entity
                return mock_result
            else:  # Email check query
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = (
                    sample_account_entity  # Email exists
                )
                return mock_result

        mock_session.execute.side_effect = execute_side_effect

        update_data = AccountData(
            email="conflict@example.com",
            password="newpassword123",
            role=AccountRoleEnum.ADMIN,
        )

        with pytest.raises(AccountConflictException):
            await account_service.update_account(1, update_data)

    async def test_delete_account_success(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test successful account deletion."""
        # Mock the database response
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_account_entity
        mock_session.execute.return_value = mock_result

        account = await account_service.delete_account(1)

        assert account.id == 1
        assert account.email == "test@example.com"
        mock_session.delete.assert_called_once_with(sample_account_entity)
        mock_session.commit.assert_called_once()

    async def test_delete_account_not_found(self, account_service, mock_session):
        """Test account deletion when account doesn't exist."""
        # Mock the database response to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        with pytest.raises(AccountNotFoundException):
            await account_service.delete_account(999)

    async def test_verify_account_credentials_success(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test successful credential verification."""
        # Mock the database response
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_account_entity
        mock_session.execute.return_value = mock_result

        # Mock password verification to return True
        account_service._verify_password = MagicMock(return_value=True)

        account = await account_service.verify_account_credentials(
            "test@example.com", "correctpassword"
        )

        assert account is not None
        assert account.id == 1
        assert account.email == "test@example.com"

    async def test_verify_account_credentials_account_not_found(
        self, account_service, mock_session
    ):
        """Test credential verification when account doesn't exist."""
        # Mock the database response to return None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        account = await account_service.verify_account_credentials(
            "nonexistent@example.com", "password"
        )

        assert account is None

    async def test_verify_account_credentials_wrong_password(
        self, account_service, mock_session, sample_account_entity
    ):
        """Test credential verification with wrong password."""
        # Mock the database response
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_account_entity
        mock_session.execute.return_value = mock_result

        # Mock password verification to return False
        account_service._verify_password = MagicMock(return_value=False)

        account = await account_service.verify_account_credentials(
            "test@example.com", "wrongpassword"
        )

        assert account is None
