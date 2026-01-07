"""
Custom exceptions for the application.

These all extend FastAPI's HTTPException to provide specific HTTP status codes
"""

from fastapi import HTTPException


class ConflictException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=409, detail=detail)


class NotFoundException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=404, detail=detail)


class ForbiddenException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=403, detail=detail)


class BadRequestException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


class UnprocessableEntityException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=422, detail=detail)


class CredentialsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InternalServerException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=500, detail=detail)
