type Account = {
  id: number;
  email: string;
  role: "student" | "admin" | "police";
};

type AccountData = {
  id: number;
  email: string;
  password: string;
  role: "student" | "admin" | "police";
};

export type { Account, AccountData };
