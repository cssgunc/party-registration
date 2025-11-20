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
 * Student data for API requests (uses snake_case to match backend)
 */
type StudentData = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  contact_preference?: "call" | "text";
  last_registered?: Date | null;
};

export type { Student, Contact, StudentData };
