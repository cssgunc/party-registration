type Student = {
  id: number;
  pid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  contactPreference: "call" | "text";
  lastRegistered: Date | null;
};

type Contact = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  contactPreference: "call" | "text";
};

/**
 * Paginated response from the student list API
 */
type PaginatedStudentsResponse = {
  items: Student[];
  total_records: number;
  page_size: number;
  page_number: number;
  total_pages: number;
};

export type { Contact, PaginatedStudentsResponse, Student };
