type PoliceRole = "officer" | "police_admin";

/**
 * DTO for Police Account responses
 */
type PoliceAccountDto = {
  id: number;
  email: string;
  role: PoliceRole;
};

/**
 * DTO for updating Police credentials
 */
type PoliceAccountUpdate = {
  email: string;
  password: string;
  role: PoliceRole;
};

export type { PoliceAccountDto, PoliceAccountUpdate, PoliceRole };
