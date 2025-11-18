from fastapi import APIRouter, Depends, HTTPException, status
from src.core.authentication import authenticate_admin
from src.modules.account.account_model import Account

from ..party.party_service import PartyService
from .complaint_model import Complaint, ComplaintCreate
from .complaint_service import ComplaintService

complaint_router = APIRouter(prefix="/api/locations", tags=["complaints"])


@complaint_router.get(
    "/{location_id}/complaints",
    response_model=list[Complaint],
    status_code=status.HTTP_200_OK,
    summary="Get all complaints for a location",
    description="Returns all complaints associated with a given location. Admin only.",
)
async def get_complaints_by_location(
    location_id: int,
    complaint_service: ComplaintService = Depends(),
    _: Account = Depends(authenticate_admin),
) -> list[Complaint]:
    """Get all complaints for a location."""
    return await complaint_service.get_complaints_by_location(location_id)


@complaint_router.post(
    "/{location_id}/complaints",
    response_model=Complaint,
    status_code=status.HTTP_201_CREATED,
    summary="Create a complaint for a location",
    description="Creates a new complaint associated with a location via a party. Admin only.",
)
async def create_complaint(
    location_id: int,
    complaint_data: ComplaintCreate,
    complaint_service: ComplaintService = Depends(),
    party_service: PartyService = Depends(),
    _: Account = Depends(authenticate_admin),
) -> Complaint:
    """
    Create a complaint from a party.
    Validates that the party is at the specified location.
    """
    # Validate that the party's location matches the URL location_id
    party = await party_service.get_party_by_id(complaint_data.party_id)
    if party.location.id != location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Party {complaint_data.party_id} is at location {party.location.id}, not location {location_id}",
        )

    # Create the complaint using the URL's location_id
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
    party_service: PartyService = Depends(),
    _: Account = Depends(authenticate_admin),
) -> Complaint:
    """
    Update a complaint.
    Validates that the party is at the specified location.
    """
    # Validate that the party's location matches the URL location_id
    party = await party_service.get_party_by_id(complaint_data.party_id)
    if party.location.id != location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Party {complaint_data.party_id} is at location {party.location.id}, not location {location_id}",
        )

    # Update the complaint
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
