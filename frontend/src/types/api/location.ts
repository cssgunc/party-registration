type Location = {
  id: number;
  citationCount: number;
  warningCount: number;
  holdExpirationDate: Date | null;
  hasActiveHold: boolean;

  // Google Maps Data
  googlePlaceId: string;
  formattedAddress: string;

  // Geography
  latitude: number;
  longitude: number;

  // Address Components
  streetNumber: string | null;
  streetName: string | null;
  unit: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
};

export type { Location };
