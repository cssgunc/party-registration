from typing import Self
from pydantic import BaseModel, EmailStr

from modules.user.user_entity import UserEntity

class UserData(BaseModel):
    email: EmailStr

class User(UserData):
    id: int

    @classmethod
    def from_entity(cls, user_entity: UserEntity) -> Self:
        return cls(
            id=user_entity.id,
            email=user_entity.email 
        )
