type Student = {
  id: number;
  pid: string;
  email: string;
  firstName: string;
  lastName: string;
  contactPreference: "call" | "text";
  lastRegistered: Date | null;
  phoneNumber: string;

  //client-side variables
  fullName: string;
};

type StudentData = {
  id: number;
  pid: string;
  email: string;
  firstName: string;
  lastName: string;
  contactPreference: "call" | "text";
  lastRegistered: Date | null;
  phoneNumber: string;
};

export type { Student, StudentData };
