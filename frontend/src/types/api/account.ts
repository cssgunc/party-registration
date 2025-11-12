type Account = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "staff" | "admin" | "student";
};

type PoliceAccount = {
  email: string;
};

export type { Account, PoliceAccount };
