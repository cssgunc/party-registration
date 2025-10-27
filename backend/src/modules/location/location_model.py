from pydantic import BaseModel


class LocationBase(BaseModel):
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None


class LocationCreate(LocationBase):
    """Schema for creating a location"""

    pass


class LocationUpdate(BaseModel):
    """Schema for updating a location"""

    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None


from pydantic import ConfigDict


class LocationOut(LocationBase):
    """Schema returned to client"""

    id: int

    model_config = ConfigDict(from_attributes=True)
