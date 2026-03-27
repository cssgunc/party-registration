type PaginatedResponse<T> = {
  items: T[];
  total_records: number;
  page_number: number;
  page_size: number;
  total_pages: number;
};

export type { PaginatedResponse };
