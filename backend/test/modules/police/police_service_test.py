import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import CredentialsException
from src.modules.police.police_entity import PoliceEntity
from src.modules.police.police_service import PoliceNotFoundException, PoliceService


@pytest.fixture()
def police_service(test_async_session: AsyncSession) -> PoliceService:
    return PoliceService(session=test_async_session)


@pytest.mark.asyncio
async def test_get_police_not_found(police_service: PoliceService) -> None:
    """Test getting police when none exists raises PoliceNotFoundException."""
    with pytest.raises(PoliceNotFoundException):
        await police_service.get_police()


@pytest.mark.asyncio
async def test_get_police_success(
    police_service: PoliceService, test_police: PoliceEntity
) -> None:
    """Test successfully getting police credentials."""
    police = await police_service.get_police()
    assert police is not None
    assert police.id == 1
    assert police.email == "police@example.com"
    assert police.hashed_password is not None


@pytest.mark.asyncio
async def test_update_police_success(
    police_service: PoliceService, test_police: PoliceEntity
) -> None:
    """Test successfully updating police credentials."""
    original_hash = test_police.hashed_password
    new_email = "newpolice@example.com"
    new_password = "newpassword123"

    updated = await police_service.update_police(new_email, new_password)

    assert updated.email == new_email
    assert updated.hashed_password != original_hash
    assert police_service._verify_password(new_password, updated.hashed_password)


@pytest.mark.asyncio
async def test_update_police_not_found(police_service: PoliceService) -> None:
    """Test updating police when none exists raises PoliceNotFoundException."""
    with pytest.raises(PoliceNotFoundException):
        await police_service.update_police("test@example.com", "password")


@pytest.mark.asyncio
async def test_verify_police_credentials_success(
    police_service: PoliceService, test_async_session: AsyncSession
) -> None:
    """Test successfully verifying valid police credentials."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)
    police = PoliceEntity(id=1, email="police@example.com", hashed_password=hashed)
    test_async_session.add(police)
    await test_async_session.commit()

    result = await police_service.verify_police_credentials(
        "police@example.com", password
    )
    assert result.id == 1
    assert result.email == "police@example.com"


@pytest.mark.asyncio
async def test_verify_police_credentials_wrong_email(
    police_service: PoliceService, test_async_session: AsyncSession
) -> None:
    """Test verifying credentials with wrong email raises CredentialsException."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)
    police = PoliceEntity(id=1, email="police@example.com", hashed_password=hashed)
    test_async_session.add(police)
    await test_async_session.commit()

    with pytest.raises(CredentialsException):
        await police_service.verify_police_credentials("wrong@example.com", password)


@pytest.mark.asyncio
async def test_verify_police_credentials_wrong_password(
    police_service: PoliceService, test_async_session: AsyncSession
) -> None:
    """Test verifying credentials with wrong password raises CredentialsException."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)
    police = PoliceEntity(id=1, email="police@example.com", hashed_password=hashed)
    test_async_session.add(police)
    await test_async_session.commit()

    with pytest.raises(CredentialsException):
        await police_service.verify_police_credentials(
            "police@example.com", "wrongpassword"
        )


@pytest.mark.asyncio
async def test_verify_police_credentials_not_found(
    police_service: PoliceService,
) -> None:
    """Test verifying credentials when police not found raises PoliceNotFoundException."""
    with pytest.raises(PoliceNotFoundException):
        await police_service.verify_police_credentials("police@example.com", "password")


@pytest.mark.asyncio
async def test_hash_password(police_service: PoliceService) -> None:
    """Test password hashing produces valid bcrypt hash."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)

    assert hashed.startswith("$2b$")
    assert police_service._verify_password(password, hashed)


@pytest.mark.asyncio
async def test_hash_password_different_salts(police_service: PoliceService) -> None:
    """Test that hashing the same password twice produces different hashes (due to salt)."""
    password = "testpassword123"
    hash1 = police_service._hash_password(password)
    hash2 = police_service._hash_password(password)

    assert hash1 != hash2
    assert police_service._verify_password(password, hash1)
    assert police_service._verify_password(password, hash2)


@pytest.mark.asyncio
async def test_verify_password_success(police_service: PoliceService) -> None:
    """Test password verification with correct password."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)

    assert police_service._verify_password(password, hashed) is True


@pytest.mark.asyncio
async def test_verify_password_failure(police_service: PoliceService) -> None:
    """Test password verification with incorrect password."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)

    assert police_service._verify_password("wrongpassword", hashed) is False


@pytest.mark.asyncio
async def test_update_police_multiple_times(
    police_service: PoliceService, test_police: PoliceEntity
) -> None:
    """Test updating police credentials multiple times."""
    updated1 = await police_service.update_police("email1@example.com", "password1")
    assert updated1.email == "email1@example.com"
    assert police_service._verify_password("password1", updated1.hashed_password)

    updated2 = await police_service.update_police("email2@example.com", "password2")
    assert updated2.email == "email2@example.com"
    assert police_service._verify_password("password2", updated2.hashed_password)
    assert not police_service._verify_password("password1", updated2.hashed_password)

    police = await police_service.get_police()
    assert police.id == 1


@pytest.mark.asyncio
async def test_verify_credentials_case_sensitive_email(
    police_service: PoliceService, test_async_session: AsyncSession
) -> None:
    """Test that email verification is case-sensitive."""
    password = "testpassword123"
    hashed = police_service._hash_password(password)
    police = PoliceEntity(id=1, email="Police@Example.com", hashed_password=hashed)
    test_async_session.add(police)
    await test_async_session.commit()

    result = await police_service.verify_police_credentials(
        "Police@Example.com", password
    )
    assert result.id == 1

    with pytest.raises(CredentialsException):
        await police_service.verify_police_credentials("police@example.com", password)
