import { LocationDto } from "../location/location.types";

/**
 * Contact preference enum matching backend
 */
type ContactPreference = "call" | "text";

/**
 * Student data without names
 */
type StudentData = {
  contact_preference: ContactPreference;
  last_registered: Date | null;
  phone_number: string;
};

/**
 * Student data including names
 */
type StudentDataWithNames = StudentData & {
  first_name: string;
  last_name: string;
};

/**
 * Student DTO
 */
type StudentDto = {
  id: number;
  pid: string;
  email: string;
  first_name: string;
  last_name: string;
  onyen: string;
  phone_number: string;
  contact_preference: ContactPreference;
  last_registered: Date | null;
  residence: ResidenceDto | null;
};

/**
 * Residence DTO
 */
type ResidenceDto = {
  location: LocationDto;
  residence_chosen_date: Date;
};

/**
 * Student DTO (backend response format with string dates)
 */
type StudentDtoBackend = Omit<StudentDto, "last_registered"> & {
  last_registered: string | null;
};

/**
 * Convert student from backend format (string dates) to frontend format (Date objects)
 */
function convertStudent(backend: StudentDtoBackend): StudentDto {
  return {
    ...backend,
    last_registered: backend.last_registered
      ? new Date(backend.last_registered)
      : null,
  };
}

/**
 * Request body for creating a student (admin)
 */
type StudentCreate = {
  account_id: number;
  data: StudentDataWithNames;
};

/**
 * Request body for updating student registration status
 */
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

export type {
  ContactPreference,
  IsRegisteredUpdate,
  StudentAutocompleteInput,
  StudentCreate,
  StudentData,
  StudentDataWithNames,
  StudentDto,
  StudentDtoBackend,
  StudentSuggestionDto,
  ResidenceDto,
};

export { convertStudent };
