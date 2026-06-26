import { isAxiosError } from "axios";
import {
  LocationDto,
  LocationDtoBackend,
  LocationStudentDto,
  LocationStudentDtoBackend,
  convertLocation,
  convertLocationStudent,
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
 * Police-visible contact shape: name + operational contact info only.
 * Used for both contact_one and contact_two in PartyPoliceDto.
 */
type ContactPoliceDto = {
  first_name: string;
  last_name: string;
  phone_number: string | null;
  contact_preference: ContactPreference | null;
};

/**
 * Police view of a party — contact PII (email, pid, onyen, residence) stripped.
 * location keeps full LocationDto (hold + incidents included).
 */
type PartyPoliceDto = {
  id: number;
  party_datetime: Date;
  location: LocationDto;
  contact_one: ContactPoliceDto;
  contact_two: ContactPoliceDto;
  status: PartyStatus;
};

type PartyPoliceDtoBackend = Omit<
  PartyPoliceDto,
  "party_datetime" | "location"
> & {
  party_datetime: string;
  location: LocationDtoBackend;
};

/**
 * Party DTO for student self-view — location incidents restricted to type and date/time.
 */
type PartyStudentDto = Omit<PartyDto, "location"> & {
  location: LocationStudentDto;
};

type PartyStudentDtoBackend = Omit<PartyDtoBackend, "location"> & {
  location: LocationStudentDtoBackend;
};

/**
 * Role discriminant used to select the correct party DTO shape.
 * "police"  → PartyPoliceDto (contacts stripped of PII)
 * "student" → PartyStudentDto (location incidents restricted to type and date/time)
 * "default" → PartyDto (full contact info for staff/admin)
 */
type PartyRole = "police" | "student" | "default";
type PartyDtoOf<R extends PartyRole> = R extends "police"
  ? PartyPoliceDto
  : R extends "student"
    ? PartyStudentDto
    : PartyDto;
type PartyDtoBackendOf<R extends PartyRole> = R extends "police"
  ? PartyPoliceDtoBackend
  : R extends "student"
    ? PartyStudentDtoBackend
    : PartyDtoBackend;

/**
 * Single generic converter — role param drives both input type narrowing and output type.
 * Omitting role defaults to "default" (full PartyDto).
 */
export function convertParty<R extends PartyRole>(
  backend: PartyDtoBackendOf<R>,
  role: R
): PartyDtoOf<R>;
export function convertParty(backend: PartyDtoBackend): PartyDto;
export function convertParty(
  backend: PartyDtoBackend | PartyPoliceDtoBackend | PartyStudentDtoBackend,
  role: PartyRole = "default"
): PartyDto | PartyPoliceDto | PartyStudentDto {
  const common = {
    id: backend.id,
    party_datetime: new Date(backend.party_datetime),
    status: backend.status,
  };
  if (role === "student") {
    const b = backend as PartyStudentDtoBackend;
    return {
      ...common,
      location: convertLocationStudent(b.location),
      contact_one: convertStudent(b.contact_one),
      contact_two: b.contact_two,
    };
  }
  const location = convertLocation(
    (backend as PartyDtoBackend | PartyPoliceDtoBackend).location
  );
  if (role === "police") {
    const b = backend as PartyPoliceDtoBackend;
    return {
      ...common,
      location,
      contact_one: b.contact_one,
      contact_two: b.contact_two,
    };
  }
  const b = backend as PartyDtoBackend;
  return {
    ...common,
    location,
    contact_one: convertStudent(b.contact_one),
    contact_two: b.contact_two,
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
 * Exact match result from proximity search.
 * party is always PartyPoliceDto — /nearby is only used in the police view context.
 */
type ExactMatchDto = {
  google_place_id: string;
  formatted_address: string;
  location: LocationDto | null;
  party: PartyPoliceDto | null;
};

type ExactMatchDtoBackend = Omit<ExactMatchDto, "location" | "party"> & {
  location: LocationDtoBackend | null;
  party: PartyPoliceDtoBackend | null;
};

/**
 * Response from GET /parties/nearby.
 * All party items are PartyPoliceDto (contacts stripped of PII).
 */
type ProximitySearchResponse = {
  exact_match: ExactMatchDto;
  nearby: PartyPoliceDto[];
};

type ProximitySearchResponseBackend = {
  exact_match: ExactMatchDtoBackend;
  nearby: PartyPoliceDtoBackend[];
};

/**
 * Map a backend proximity-search payload into frontend types.
 *
 * Converts the exact-match location/party and every nearby party (all police
 * DTOs), parsing string dates into `Date` objects along the way.
 */
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
        ? convertParty(backend.exact_match.party, "police")
        : null,
    },
    nearby: backend.nearby.map((p) => convertParty(p, "police")),
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
  PARTY_SAME_DAY: "PARTY_SAME_DAY",
  PARTY_DATE_TOO_SOON: "PARTY_DATE_TOO_SOON",
  PARTY_DATE_TOO_FAR: "PARTY_DATE_TOO_FAR",
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
  PARTY_SAME_DAY: "A party is already registered on that day.",
  PARTY_DATE_TOO_SOON: "Party must be at least 24 hours in the future.",
  PARTY_DATE_TOO_FAR: "Party cannot be scheduled more than 30 days in advance.",
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
  ContactPoliceDto,
  CreatePartyDto,
  ExactMatchDto,
  PartyDto,
  PartyDtoBackend,
  PartyDtoBackendOf,
  PartyDtoOf,
  PartyPoliceDto,
  PartyPoliceDtoBackend,
  PartyRole,
  PartyStudentDto,
  PartyStudentDtoBackend,
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
