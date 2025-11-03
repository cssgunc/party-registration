type LocationDto = {
  id: number;

  // OCSL Data
  warning_count: number;
  citation_count: number;
  hold_expiration: string | null;
  has_active_hold: boolean;

  // Google Maps Data
  google_place_id: string;
  formatted_address: string;

  // Geography
  latitude: number;
  longitude: number;

  // Address Components
  street_number: string | null;
  street_name: string | null;
  unit: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
};

type Location = Omit<LocationDto, "hold_expiration"> & {
  hold_expiration: Date | null;
};

export type { Location, LocationDto };
