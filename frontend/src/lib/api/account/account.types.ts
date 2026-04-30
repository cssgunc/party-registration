import type { PoliceRole } from "@/lib/api/police/police.types";
import z from "zod";

export const ACCOUNT_ROLES = ["student", "staff", "admin"] as const;

export const accountRoleSchema = z.enum(ACCOUNT_ROLES);

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export type InviteTokenRole = "staff" | "admin";

export type AppRole = AccountRole | PoliceRole;

export type AccountStatus = "active" | "unverified" | "invited";

type CreateInviteDto = {
  email: string;
  role: InviteTokenRole;
};

type AccountUpdateData = {
  role: AccountRole;
};

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
 * Unified row returned by GET /api/accounts/aggregate.
 * Combines staff/admin accounts, police accounts, and pending invite tokens.
 * source_id is the ID of the backing entity (account, police, or invite token).
 */
type AggregateAccountDto = {
  source_id: number;
  email: string;
  role: string;
  status: AccountStatus;
  first_name: string | null;
  last_name: string | null;
  onyen: string | null;
  pid: string | null;
};

export type {
  AccountDto,
  AccountUpdateData,
  AggregateAccountDto,
  CreateInviteDto,
};
