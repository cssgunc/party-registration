"""Custom exceptions for the application.

These all extend FastAPI's HTTPException to provide specific HTTP status codes.
"""

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response body returned for HTTP error status codes.

    The global exception handler serializes every API error as
    ``{"detail": <message>}``. Reference this model from a route's ``responses``
    map (via `error_response`) so the generated OpenAPI docs show the real
    error shape instead of a generic body.
    """

    detail: str


def error_response(description: str) -> dict[str, Any]:
    """Build an OpenAPI ``responses`` entry that documents an error status code.

    Args:
        description: When this error occurs. Only document status codes a client
            can realistically trigger (see the error-reachability convention in
            ``backend/AGENTS.md``).

    Returns:
        A value for a route's ``responses={...}`` map, wiring in the shared
        `ErrorResponse` schema.
    """
    return {"model": ErrorResponse, "description": description}


class ConflictException(HTTPException):
    """Represents a 409 Conflict — the request conflicts with an existing resource."""

    def __init__(self, detail: str):
        super().__init__(status_code=409, detail=detail)


class NotFoundException(HTTPException):
    """Represents a 404 Not Found — the requested resource does not exist."""

    def __init__(self, detail: str):
        super().__init__(status_code=404, detail=detail)


class ForbiddenException(HTTPException):
    """Represents a 403 Forbidden — the caller lacks permission to perform the action."""

    def __init__(self, detail: str):
        super().__init__(status_code=403, detail=detail)


class BadRequestException(HTTPException):
    """Represents a 400 Bad Request — the request is malformed or violates business rules."""

    def __init__(self, detail: str | dict[str, Any]):
        super().__init__(status_code=400, detail=detail)


class UnprocessableEntityException(HTTPException):
    """Represents a 422 Unprocessable Entity — semantically invalid input."""

    def __init__(self, detail: str):
        super().__init__(status_code=422, detail=detail)


class CredentialsException(HTTPException):
    """Represents a 401 Unauthorized — the bearer token is missing, invalid, or expired."""

    def __init__(self):
        super().__init__(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InternalServerException(HTTPException):
    """Represents a 500 Internal Server Error — an unexpected server-side failure."""

    def __init__(self, detail: str):
        super().__init__(status_code=500, detail=detail)
