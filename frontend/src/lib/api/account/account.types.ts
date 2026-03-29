/**
 * Account role types matching backend AccountRole enum
 */
export type AccountRole = "student" | "staff" | "admin";

/**
 * All application-level roles, including police which authenticates
 * separately from SAML-based accounts.
 */
export type AppRole = AccountRole | "police";

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
