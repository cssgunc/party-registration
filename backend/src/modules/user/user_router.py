from core.authentication import authenticate_user
from fastapi import APIRouter, Depends
from modules.user.user_model import User, UserData
from modules.user.user_service import UserService

user_router = APIRouter(prefix="/api/users", tags=["users"])


@user_router.get("/")
async def list_users(
    user_service: UserService = Depends(), _=Depends(authenticate_user)
) -> list[User]:
    return await user_service.get_users()


@user_router.get("/{user_id}")
async def get_user(
    user_id: int, user_service: UserService = Depends(), _=Depends(authenticate_user)
) -> User:
    return await user_service.get_user_by_id(user_id)


@user_router.post("/", status_code=201)
async def create_user(
    data: UserData, user_service: UserService = Depends(), _=Depends(authenticate_user)
) -> User:
    return await user_service.create_user(data)


@user_router.put("/{user_id}")
async def update_user(
    user_id: int,
    data: UserData,
    user_service: UserService = Depends(),
    _=Depends(authenticate_user),
) -> User:
    return await user_service.update_user(user_id, data)


@user_router.delete("/{user_id}")
async def delete_user(
    user_id: int, user_service: UserService = Depends(), _=Depends(authenticate_user)
) -> User:
    return await user_service.delete_user(user_id)
