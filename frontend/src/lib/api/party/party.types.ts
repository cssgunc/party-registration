import {
  convertLocation,
  LocationDto,
  LocationDtoBackend,
} from "../location/location.types";
import {
  ContactPreference,
  convertStudent,
  StudentDto,
  StudentDtoBackend,
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
  contact_one_email: string;
  contact_two: ContactDto;
};

/**
 * Discriminated union for party creation/update
 */
type CreatePartyDto = StudentCreatePartyDto | AdminCreatePartyDto;

export type {
  AdminCreatePartyDto,
  ContactDto,
  CreatePartyDto,
  PartyDto,
  PartyDtoBackend,
  StudentCreatePartyDto,
};
