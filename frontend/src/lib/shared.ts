type PaginatedResponse<T> = {
  items: T[];
  total_records: number;
  page_number: number;
  page_size: number;
  total_pages: number;
};

type StringRole = "staff" | "admin" | "student" | "police" | "unauthenticated";

export type { PaginatedResponse, StringRole };
