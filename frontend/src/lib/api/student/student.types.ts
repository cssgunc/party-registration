import {
  LocationDto,
  LocationDtoBackend,
  LocationStudentDto,
  LocationStudentDtoBackend,
  convertLocation,
  convertLocationStudent,
} from "../location/location.types";

type ContactPreference = "call" | "text";

type StudentData = {
  contact_preference: ContactPreference;
  last_registered: Date | null;
  phone_number: string;
};

type StudentUpdateDto = StudentData & {
  first_name: string;
  last_name: string;
  residence_place_id?: string | null;
};

type StudentDto = {
  id: number;
  pid: string;
  email: string;
  first_name: string;
  last_name: string;
  onyen: string;
  phone_number: string | null;
  contact_preference: ContactPreference | null;
  last_registered: Date | null;
  residence: ResidenceDto | null;
};

type ResidenceDto = {
  location: LocationDto;
  residence_chosen_date: Date;
};

type ResidenceDtoBackend = {
  location: LocationDtoBackend;
  residence_chosen_date: string;
};

type StudentDtoBackend = Omit<StudentDto, "last_registered" | "residence"> & {
  last_registered: string | null;
  residence: ResidenceDtoBackend | null;
};

type ResidenceStudentDto = {
  location: LocationStudentDto;
  residence_chosen_date: Date;
};

type ResidenceStudentDtoBackend = {
  location: LocationStudentDtoBackend;
  residence_chosen_date: string;
};

type StudentSelfDto = Omit<StudentDto, "residence"> & {
  residence: ResidenceStudentDto | null;
};

type StudentSelfDtoBackend = Omit<
  StudentSelfDto,
  "last_registered" | "residence"
> & {
  last_registered: string | null;
  residence: ResidenceStudentDtoBackend | null;
};

type ResidenceUpdateDto = {
  residence_place_id: string;
};

type ResidenceUpdateWithDisplayDto = ResidenceUpdateDto & {
  formatted_address: string;
};

/**
 * Role discriminant used to select the correct student DTO shape.
 * "self" → StudentSelfDto (residence uses the student-visible LocationStudentDto)
 * "default" → StudentDto (residence uses full LocationDto for staff/admin)
 */
type StudentRole = "self" | "default";
type StudentDtoOf<R extends StudentRole> = R extends "self"
  ? StudentSelfDto
  : StudentDto;
type StudentDtoBackendOf<R extends StudentRole> = R extends "self"
  ? StudentSelfDtoBackend
  : StudentDtoBackend;

/**
 * Single generic converter — role param drives both input type narrowing and
 * output type. Omitting role defaults to "default" (full StudentDto).
 */
function convertStudent<R extends StudentRole>(
  backend: StudentDtoBackendOf<R>,
  role: R
): StudentDtoOf<R>;
function convertStudent(backend: StudentDtoBackend): StudentDto;
function convertStudent(
  backend: StudentDtoBackend | StudentSelfDtoBackend,
  role: StudentRole = "default"
): StudentDto | StudentSelfDto {
  const last_registered = backend.last_registered
    ? new Date(backend.last_registered)
    : null;
  if (role === "self") {
    const b = backend as StudentSelfDtoBackend;
    return {
      ...b,
      last_registered,
      residence: b.residence
        ? {
            location: convertLocationStudent(b.residence.location),
            residence_chosen_date: new Date(b.residence.residence_chosen_date),
          }
        : null,
    };
  }
  const b = backend as StudentDtoBackend;
  return {
    ...b,
    last_registered,
    residence: b.residence
      ? {
          location: convertLocation(b.residence.location),
          residence_chosen_date: new Date(b.residence.residence_chosen_date),
        }
      : null,
  };
}

type IsRegisteredUpdate = {
  is_registered: boolean;
};

/**
 * Input for student autocomplete search
 */
type StudentAutocompleteInput = {
  query: string;
};

/**
 * Student suggestion DTO returned by autocomplete
 */
type StudentSuggestionDto = {
  student_id: number;
  first_name: string;
  last_name: string;
  matched_field_name: string;
  matched_field_value: string;
};

/**
 * Query keys for student-related queries
 * Used across admin and student queries for cache management
 */
export const STUDENTS_KEY = ["students"] as const;
export const CURRENT_STUDENT_KEY = [...STUDENTS_KEY, "me"] as const;

export type {
  ContactPreference,
  IsRegisteredUpdate,
  ResidenceDto,
  ResidenceStudentDto,
  ResidenceStudentDtoBackend,
  ResidenceUpdateDto,
  ResidenceUpdateWithDisplayDto,
  StudentAutocompleteInput,
  StudentData,
  StudentUpdateDto,
  StudentDto,
  StudentDtoBackend,
  StudentDtoBackendOf,
  StudentDtoOf,
  StudentRole,
  StudentSelfDto,
  StudentSelfDtoBackend,
  StudentSuggestionDto,
};

export { convertStudent };
