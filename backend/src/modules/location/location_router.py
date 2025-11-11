from fastapi import APIRouter, Depends, HTTPException, status
from src.core.authentication import authenticate_user
from src.modules.account.account_model import Account

from .location_model import AutocompleteInput, AutocompleteResult
from .location_service import LocationService

location_router = APIRouter(prefix="/api/locations", tags=["locations"])


@location_router.post(
    "/autocomplete",
    response_model=list[AutocompleteResult],
    status_code=status.HTTP_200_OK,
    summary="Autocomplete address search",
    description="Returns address suggestions based on user input using Google Maps Places API.",
)
async def autocomplete_address(
    input_data: AutocompleteInput,
    location_service: LocationService = Depends(),
    user: Account = Depends(authenticate_user),
) -> list[AutocompleteResult]:
    """
    Autocomplete address search endpoint.
    """
    try:
        results = await location_service.autocomplete_address(input_data.address)
        return results
    except ValueError as e:
        # Handle validation errors from service
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        # Log error in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch address suggestions. Please try again later.",
        )
