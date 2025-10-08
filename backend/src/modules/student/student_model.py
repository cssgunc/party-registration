import enum
from datetime import datetime

from pydantic import BaseModel, Field


class CallOrTextPref(enum.Enum):
    call = "call"
    text = "text"


class StudentData(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    call_or_text_pref: CallOrTextPref
    last_registered: datetime | None = None
    phone_number: str = Field(pattern=r"^\+?1?\d{9,15}$")


class Student(StudentData):
    id: int
    account_id: int

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
