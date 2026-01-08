from pydantic import BaseModel


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total_records: int
    page_size: int
    page_number: int
    total_pages: int
