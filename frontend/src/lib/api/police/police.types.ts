/**
 * DTO for Police Account responses
 */
type PoliceAccountDto = {
  email: string;
};

/**
 * DTO for updating Police credentials
 */
type PoliceAccountUpdate = {
  email: string;
  password: string;
};

export type { PoliceAccountDto, PoliceAccountUpdate };
