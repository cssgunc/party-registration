from fastapi import APIRouter, Depends, status
from src.core.authentication import authenticate_admin, authenticate_staff_or_admin
from src.modules.account.account_model import AccountDto

from .complaint_model import ComplaintData, ComplaintDto
from .complaint_service import ComplaintService

complaint_router = APIRouter(prefix="/api/locations", tags=["complaints"])


@complaint_router.get(
    "/{location_id}/complaints",
    response_model=list[ComplaintDto],
    status_code=status.HTTP_200_OK,
    summary="Get all complaints for a location",
    description="Returns all complaints associated with a given location. Staff or admin only.",
)
async def get_complaints_by_location(
    location_id: int,
    complaint_service: ComplaintService = Depends(),
    _: AccountDto = Depends(authenticate_staff_or_admin),
) -> list[ComplaintDto]:
    """Get all complaints for a location."""
    return await complaint_service.get_complaints_by_location(location_id)


@complaint_router.post(
    "/{location_id}/complaints",
    response_model=ComplaintDto,
    status_code=status.HTTP_201_CREATED,
    summary="Create a complaint for a location",
    description="Creates a new complaint associated with a location. Admin only.",
)
async def create_complaint(
    location_id: int,
    complaint_data: ComplaintData,
    complaint_service: ComplaintService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> ComplaintDto:
    """Create a complaint for a location."""
    return await complaint_service.create_complaint(location_id, complaint_data)


@complaint_router.put(
    "/{location_id}/complaints/{complaint_id}",
    response_model=ComplaintDto,
    status_code=status.HTTP_200_OK,
    summary="Update a complaint",
    description="Updates an existing complaint. Admin only.",
)
async def update_complaint(
    location_id: int,
    complaint_id: int,
    complaint_data: ComplaintData,
    complaint_service: ComplaintService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> ComplaintDto:
    """Update a complaint."""
    return await complaint_service.update_complaint(complaint_id, location_id, complaint_data)


@complaint_router.delete(
    "/{location_id}/complaints/{complaint_id}",
    response_model=ComplaintDto,
    status_code=status.HTTP_200_OK,
    summary="Delete a complaint",
    description="Deletes a complaint. Admin only.",
)
async def delete_complaint(
    location_id: int,
    complaint_id: int,
    complaint_service: ComplaintService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> ComplaintDto:
    """Delete a complaint."""
    return await complaint_service.delete_complaint(complaint_id)
