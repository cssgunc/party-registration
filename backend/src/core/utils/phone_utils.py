from typing import Annotated

from pydantic import Field

PhoneNumber = Annotated[
    str,
    Field(pattern=r"^\d{10}$", description="10-digit US phone number (digits only, no formatting)"),
]
