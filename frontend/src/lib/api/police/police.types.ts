import z from "zod";

export const POLICE_ROLES = ["officer", "police_admin"] as const;

export const policeRoleSchema = z.enum(POLICE_ROLES);

export type PoliceRole = (typeof POLICE_ROLES)[number];

/**
 * DTO for Police Account responses
 */
export type PoliceAccountDto = {
  id: number;
  email: string;
  role: PoliceRole;
  is_verified: boolean;
};

/**
 * DTO for updating police account details
 */
export type PoliceAccountUpdate = {
  email: string;
  role: PoliceRole;
  is_verified: boolean;
};
