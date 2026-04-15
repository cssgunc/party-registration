import type { PoliceRole } from "@/lib/api/police/police.types";

/**
 * Account role types matching backend AccountRole enum
 */
export type AccountRole = "student" | "staff" | "admin";

/**
 * All application-level roles, including police identities which authenticate
 * separately from SAML-based accounts.
 */
export type AppRole = AccountRole | PoliceRole;

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

/**
 * Unified row type for the Accounts table, which mixes regular accounts
 * and police accounts. Police rows have "-" for IdP-owned fields.
 */
type AccountTableRow = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  onyen: string;
  role: AppRole;
  _isPolice: boolean;
};

export type { AccountData, AccountDto, AccountTableRow };
