import {
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "../location/location.types";
import {
  ContactPreference,
  StudentDto,
  StudentDtoBackend,
  convertStudent,
} from "../student/student.types";

/**
 * Contact information for second contact (no dates to convert)
 */
type ContactDto = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: ContactPreference;
};

/**
 * Party DTO
 */
type PartyDto = {
  id: number;
  party_datetime: Date;
  location: LocationDto;
  contact_one: StudentDto;
  contact_two: ContactDto;
};

/**
 * Party DTO (backend response format with string dates)
 */
type PartyDtoBackend = Omit<
  PartyDto,
  "party_datetime" | "location" | "contact_one"
> & {
  party_datetime: string;
  location: LocationDtoBackend;
  contact_one: StudentDtoBackend;
};

/**
 * Convert party from backend format (string dates) to frontend format (Date objects)
 */
export function convertParty(backend: PartyDtoBackend): PartyDto {
  return {
    id: backend.id,
    party_datetime: new Date(backend.party_datetime),
    location: convertLocation(backend.location),
    contact_one: convertStudent(backend.contact_one),
    contact_two: backend.contact_two,
  };
}

/**
 * Input for students creating a party registration
 */
type StudentCreatePartyDto = {
  type: "student";
  party_datetime: Date;
  google_place_id: string;
  contact_two: ContactDto;
};

/**
 * Input for admins creating or updating a party registration
 */
type AdminCreatePartyDto = {
  type: "admin";
  party_datetime: Date;
  google_place_id: string;
  contact_one_student_id: number;
  contact_two: ContactDto;
};

/**
 * Discriminated union for party creation/update
 */
type CreatePartyDto = StudentCreatePartyDto | AdminCreatePartyDto;

/**
 * Exact match result from proximity search
 */
type ExactMatchDto = {
  google_place_id: string;
  formatted_address: string;
  location: LocationDto | null;
  party: PartyDto | null;
};

type ExactMatchDtoBackend = Omit<ExactMatchDto, "location" | "party"> & {
  location: LocationDtoBackend | null;
  party: PartyDtoBackend | null;
};

/**
 * Response from GET /parties/nearby
 */
type ProximitySearchResponse = {
  exact_match: ExactMatchDto;
  nearby: PartyDto[];
};

type ProximitySearchResponseBackend = {
  exact_match: ExactMatchDtoBackend;
  nearby: PartyDtoBackend[];
};

function convertProximitySearchResponse(
  backend: ProximitySearchResponseBackend
): ProximitySearchResponse {
  return {
    exact_match: {
      google_place_id: backend.exact_match.google_place_id,
      formatted_address: backend.exact_match.formatted_address,
      location: backend.exact_match.location
        ? convertLocation(backend.exact_match.location)
        : null,
      party: backend.exact_match.party
        ? convertParty(backend.exact_match.party)
        : null,
    },
    nearby: backend.nearby.map(convertParty),
  };
}

/**
 * Query keys for party-related queries
 * Used across admin and student party queries for cache management
 */
export const PARTIES_KEY = ["parties"] as const;
export const NEARBY_KEY = [...PARTIES_KEY, "nearby"] as const;
export const MY_PARTIES_KEY = [...PARTIES_KEY, "me"] as const;

export type {
  AdminCreatePartyDto,
  ContactDto,
  CreatePartyDto,
  ExactMatchDto,
  PartyDto,
  PartyDtoBackend,
  ProximitySearchResponse,
  ProximitySearchResponseBackend,
  StudentCreatePartyDto,
};
export { convertProximitySearchResponse };
