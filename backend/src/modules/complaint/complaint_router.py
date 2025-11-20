from fastapi import APIRouter, Depends, status
from src.core.authentication import authenticate_admin, authenticate_staff_or_admin
from src.modules.account.account_model import Account

from .complaint_model import Complaint, ComplaintCreate
from .complaint_service import ComplaintService

complaint_router = APIRouter(prefix="/api/locations", tags=["complaints"])


@complaint_router.get(
    "/{location_id}/complaints",
    response_model=list[Complaint],
    status_code=status.HTTP_200_OK,
    summary="Get all complaints for a location",
    description="Returns all complaints associated with a given location. Staff or admin only.",
)
async def get_complaints_by_location(
    location_id: int,
    complaint_service: ComplaintService = Depends(),
    _: Account = Depends(authenticate_staff_or_admin),
) -> list[Complaint]:
    """Get all complaints for a location."""
    return await complaint_service.get_complaints_by_location(location_id)


@complaint_router.post(
    "/{location_id}/complaints",
    response_model=Complaint,
    status_code=status.HTTP_201_CREATED,
    summary="Create a complaint for a location",
    description="Creates a new complaint associated with a location. Admin only.",
)
async def create_complaint(
    location_id: int,
    complaint_data: ComplaintCreate,
    complaint_service: ComplaintService = Depends(),
    _: Account = Depends(authenticate_admin),
) -> Complaint:
    """Create a complaint for a location."""
    return await complaint_service.create_complaint(location_id, complaint_data)


@complaint_router.put(
    "/{location_id}/complaints/{complaint_id}",
    response_model=Complaint,
    status_code=status.HTTP_200_OK,
    summary="Update a complaint",
    description="Updates an existing complaint. Admin only.",
)
async def update_complaint(
    location_id: int,
    complaint_id: int,
    complaint_data: ComplaintCreate,
    complaint_service: ComplaintService = Depends(),
    _: Account = Depends(authenticate_admin),
) -> Complaint:
    """Update a complaint."""
    return await complaint_service.update_complaint(
        complaint_id, location_id, complaint_data
    )


@complaint_router.delete(
    "/{location_id}/complaints/{complaint_id}",
    response_model=Complaint,
    status_code=status.HTTP_200_OK,
    summary="Delete a complaint",
    description="Deletes a complaint. Admin only.",
)
async def delete_complaint(
    location_id: int,
    complaint_id: int,
    complaint_service: ComplaintService = Depends(),
    _: Account = Depends(authenticate_admin),
) -> Complaint:
    """Delete a complaint."""
    return await complaint_service.delete_complaint(complaint_id)
