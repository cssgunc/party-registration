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

/**
 * Contact information (API format with snake_case)
 * This is what the backend returns and expects
 */
type ContactAPI = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
};

/**
 * Contact information (Frontend format with camelCase)
 * This is what the frontend components use
 */
type Contact = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  contactPreference: "call" | "text";
};

export type { Contact, ContactAPI, Student };
