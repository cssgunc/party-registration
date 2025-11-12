type Student = {
  id: number;
  pid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  contactPreference: "call" | "text";
  lastRegistered: string | null;
};

type Contact = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  contactPreference: "call" | "text";
};

export type { Student, Contact };
