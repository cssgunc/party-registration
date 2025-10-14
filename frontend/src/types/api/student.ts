type Student = {
  id: number;
  firstName: string;
  lastName: string;
  contactPrefrence: "call" | "text";
  registerDate: Date | null;
  phoneNumber: string;

  //client-side variables
  fullName: string;
};

type StudentData = {
  id: number;
  firstName: string;
  lastName: string;
  contactPrefrence: "call" | "text";
  registerDate: Date | null;
  phoneNumber: string;
};

export type { Student, StudentData };
