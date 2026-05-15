import { isAxiosError } from "axios";
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

const PartyStatus = {
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
} as const;

type PartyStatus = (typeof PartyStatus)[keyof typeof PartyStatus];

/**
 * Party DTO
 */
type PartyDto = {
  id: number;
  party_datetime: Date;
  location: LocationDto;
  contact_one: StudentDto;
  contact_two: ContactDto;
  status: PartyStatus;
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
    status: backend.status,
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
 * Backend party-validation rule codes. Must mirror PartyRule in
 * backend/src/modules/party/party_service.py exactly.
 *
 * The backend returns `{detail: {code, message}}` for any party-validation
 * failure (400). The `code` field maps to one of these values; the user-facing
 * copy lives in PARTY_RULE_MESSAGES below. The backend's `message` field is
 * for logs/debugging only.
 */
const PartyRuleCode = {
  STUDENT_INFO_NOT_PROVIDED: "STUDENT_INFO_NOT_PROVIDED",
  PARTY_DATE_TOO_SOON: "PARTY_DATE_TOO_SOON",
  PARTY_SMART_NOT_COMPLETED: "PARTY_SMART_NOT_COMPLETED",
  NO_RESIDENCE: "NO_RESIDENCE",
  LOCATION_HOLD_ACTIVE: "LOCATION_HOLD_ACTIVE",
  CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE:
    "CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE",
  CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE:
    "CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE",
  PARTY_CANCELLED: "PARTY_CANCELLED",
  PARTY_IN_PAST: "PARTY_IN_PAST",
  PARTY_NOT_OWNED_BY_STUDENT: "PARTY_NOT_OWNED_BY_STUDENT",
} as const;

type PartyRuleCode = (typeof PartyRuleCode)[keyof typeof PartyRuleCode];

/**
 * Exhaustive map from rule code to user-facing copy.
 * Used by both client-side validation (so messages match the server) and
 * by error-handling code that surfaces server validation failures.
 */
const PARTY_RULE_MESSAGES = {
  STUDENT_INFO_NOT_PROVIDED:
    "Please provide your phone number and contact preference before registering a party.",
  PARTY_DATE_TOO_SOON: "Party must be at least 2 business days in the future.",
  PARTY_SMART_NOT_COMPLETED:
    "The Party Smart course must be completed for the current academic year before registering a party.",
  NO_RESIDENCE: "Please select a residence before registering a party.",
  LOCATION_HOLD_ACTIVE:
    "This location has an active hold and cannot host a party right now.",
  CONTACT_TWO_EMAIL_MATCHES_CONTACT_ONE:
    "Second contact's email must be different from first contact's.",
  CONTACT_TWO_PHONE_MATCHES_CONTACT_ONE:
    "Second contact's phone number must be different from first contact's.",
  PARTY_CANCELLED: "This party has already been cancelled.",
  PARTY_IN_PAST:
    "This party has already occurred and can no longer be modified.",
  PARTY_NOT_OWNED_BY_STUDENT: "You can only modify your own parties.",
} as const satisfies Record<PartyRuleCode, string>;

type PartyValidationError = {
  code: PartyRuleCode;
  message: string;
};

function isPartyRuleCode(value: unknown): value is PartyRuleCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PARTY_RULE_MESSAGES, value)
  );
}

/**
 * If `error` is an axios error carrying a PartyValidationException response
 * (`{detail: {code, message}}` with a known code), return the mapped
 * user-facing error. Otherwise return null and let the caller fall back to
 * its generic error handler.
 */
function getPartyValidationError(error: unknown): PartyValidationError | null {
  if (!isAxiosError(error)) return null;
  const detail = error.response?.data?.detail;
  if (typeof detail !== "object" || detail === null) return null;
  const code = (detail as { code?: unknown }).code;
  if (!isPartyRuleCode(code)) return null;
  return { code, message: PARTY_RULE_MESSAGES[code] };
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
  PartyValidationError,
  ProximitySearchResponse,
  ProximitySearchResponseBackend,
  StudentCreatePartyDto,
};

export {
  PARTY_RULE_MESSAGES,
  PartyRuleCode,
  PartyStatus,
  convertProximitySearchResponse,
  getPartyValidationError,
};
