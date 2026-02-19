/**
 * Account role types matching backend AccountRole enum
 */
export type AccountRole = "student" | "staff" | "admin";

/**
 * DTO for creating/updating an Account
 */
type AccountData = {
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  onyen: string;
  role: AccountRole;
};

/**
 * DTO for Account responses
 */
type AccountDto = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  onyen: string;
  role: AccountRole;
};

export type { AccountData, AccountDto };
