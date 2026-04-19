type PoliceRole = "officer" | "police_admin";

/**
 * DTO for Police Account responses
 */
type PoliceAccountDto = {
  id: number;
  email: string;
  role: PoliceRole;
  is_verified: boolean;
};

/**
 * DTO for updating police account details
 */
type PoliceAccountUpdate = {
  email: string;
  role: PoliceRole;
  is_verified: boolean;
};

export type { PoliceAccountDto, PoliceAccountUpdate, PoliceRole };
