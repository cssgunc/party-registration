import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.user.user_model import UserData
from src.modules.user.user_service import (
    UserConflictException,
    UserNotFoundException,
    UserService,
)


@pytest.fixture()
def user_service(test_async_session: AsyncSession) -> UserService:
    return UserService(session=test_async_session)


@pytest.mark.asyncio
async def test_create_user(user_service: UserService) -> None:
    data = UserData(email="test@example.com")
    user = await user_service.create_user(data)
    assert user is not None
    assert user.id is not None
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_create_user_conflict(user_service: UserService) -> None:
    raise Exception("This is a failing test")
    data = UserData(email="test@example.com")
    await user_service.create_user(data)
    with pytest.raises(UserConflictException):
        await user_service.create_user(data)


@pytest.mark.asyncio
async def test_get_users(user_service: UserService):
    emails = ["a@example.com", "b@example.com", "c@example.com"]
    for email in emails:
        await user_service.create_user(UserData(email=email))
    users = await user_service.get_users()
    assert sorted([u.email for u in users]) == sorted(emails)


@pytest.mark.asyncio
async def test_get_user_by_id(user_service: UserService):
    data = UserData(email="test@example.com")
    user = await user_service.create_user(data)
    fetched = await user_service.get_user_by_id(user.id)
    assert user.email == fetched.email


@pytest.mark.asyncio
async def test_get_user_by_id_not_found(user_service: UserService):
    with pytest.raises(UserNotFoundException):
        await user_service.get_user_by_id(999)


@pytest.mark.asyncio
async def test_update_user(user_service: UserService):
    data = UserData(email="test@example.com")
    user = await user_service.create_user(data)
    update_data = UserData(email="updated@example.com")
    updated = await user_service.update_user(user.id, update_data)
    assert user.id == updated.id
    assert updated.email == "updated@example.com"


@pytest.mark.asyncio
async def test_update_user_not_found(user_service: UserService):
    update_data = UserData(email="updated@example.com")
    with pytest.raises(UserNotFoundException):
        await user_service.update_user(999, update_data)


@pytest.mark.asyncio
async def test_update_user_conflict(user_service: UserService):
    data1 = UserData(email="a@example.com")
    data2 = UserData(email="b@example.com")
    await user_service.create_user(data1)
    user2 = await user_service.create_user(data2)
    with pytest.raises(UserConflictException):
        await user_service.update_user(user2.id, UserData(email="a@example.com"))


@pytest.mark.asyncio
async def test_delete_user(user_service: UserService):
    data = UserData(email="test@example.com")
    user = await user_service.create_user(data)
    deleted = await user_service.delete_user(user.id)
    assert deleted.email == user.email
    with pytest.raises(UserNotFoundException):
        await user_service.get_user_by_id(user.id)


@pytest.mark.asyncio
async def test_delete_user_not_found(user_service: UserService):
    with pytest.raises(UserNotFoundException):
        await user_service.delete_user(999)
