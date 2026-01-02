/**
 * Input for address autocomplete
 */
type AutocompleteInput = {
  address: string;
};

/**
 * Result from Google Maps autocomplete
 */
type AutocompleteResult = {
  formatted_address: string;
  google_place_id: string;
};

/**
 * Location data without OCSL-specific fields
 */
type AddressData = {
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
};

/**
 * Location data with OCSL-specific fields
 */
type LocationData = AddressData & {
  warning_count: number;
  citation_count: number;
  hold_expiration: Date | null;
};

/**
 * Complaint DTO
 */
type ComplaintDto = {
  id: number;
  location_id: number;
  complaint_datetime: Date;
  description: string;
};

/**
 * Complaint DTO (backend response format with string dates)
 */
type ComplaintDtoBackend = Omit<ComplaintDto, "complaint_datetime"> & {
  complaint_datetime: string;
};

/**
 * Convert complaint from backend format (string dates) to frontend format (Date objects)
 */
function convertComplaint(backend: ComplaintDtoBackend): ComplaintDto {
  return {
    ...backend,
    complaint_datetime: new Date(backend.complaint_datetime),
  };
}

/**
 * Location DTO
 */
type LocationDto = LocationData & {
  id: number;
  complaints: ComplaintDto[];
};

/**
 * Location DTO (backend response format with string dates)
 */
type LocationDtoBackend = Omit<
  LocationDto,
  "hold_expiration" | "complaints"
> & {
  hold_expiration: string | null;
  complaints: ComplaintDtoBackend[];
};

/**
 * Convert location from backend format (string dates) to frontend format (Date objects)
 */
function convertLocation(backend: LocationDtoBackend): LocationDto {
  return {
    ...backend,
    hold_expiration: backend.hold_expiration
      ? new Date(backend.hold_expiration)
      : null,
    complaints: backend.complaints.map(convertComplaint),
  };
}

/**
 * Input for creating/updating a location
 */
type LocationCreate = {
  google_place_id: string;
  warning_count?: number;
  citation_count?: number;
  hold_expiration?: Date | null;
};

export type {
  AddressData,
  AutocompleteInput,
  AutocompleteResult,
  ComplaintDto,
  ComplaintDtoBackend,
  LocationCreate,
  LocationData,
  LocationDto,
  LocationDtoBackend,
};

export { convertComplaint, convertLocation };
