from pydantic import BaseModel, EmailStr


class UserData(BaseModel):
    email: EmailStr


class User(UserData):
    id: int
