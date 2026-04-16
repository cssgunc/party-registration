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
 * DTO for creating police accounts
 */
type PoliceAccountCreate = {
  email: string;
  password: string;
  role: PoliceRole;
};

/**
 * DTO for updating police account details
 */
type PoliceAccountUpdate = {
  email: string;
  role: PoliceRole;
};

export type {
  PoliceAccountCreate,
  PoliceAccountDto,
  PoliceAccountUpdate,
  PoliceRole,
};
