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

export interface BackendLocation {
  id: number;
  citation_count: number;
  warning_count: number;
  hold_expiration: string | null;
  has_active_hold: boolean;
  google_place_id: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  street_number: string | null;
  street_name: string | null;
  unit: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
}

export type { Location };
