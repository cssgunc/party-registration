type Account = {
  email: string;
  role: "student" | "admin" | "police";
};

type AccountData = {
  email: string;
  password: string;
  role: "student" | "admin" | "police";
};

export type { Account, AccountData };
