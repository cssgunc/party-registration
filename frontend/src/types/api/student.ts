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
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
};

export type { Contact, Student };
