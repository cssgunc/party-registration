type Account = {
  id: number;
  pid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "staff" | "admin" | "student";
};

type PoliceAccount = {
  email: string;
};

export type { Account, PoliceAccount };
