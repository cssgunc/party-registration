import type { BackendLocation, Location } from "../location/location.types";
import type {
  BackendContact,
  Contact,
  Student,
} from "../student/student.types";

/**
 * Party data for frontend use (with camelCase and Date objects)
 */
type Party = {
  id: number;
  datetime: Date;
  location: Location;
  contactOne: Student;
  contactTwo: Contact;
};

/**
 * DTO for creating a party as a student
 */
type StudentCreatePartyDTO = {
  type: "student";
  party_datetime: string; // ISO format
  place_id: string;
  contact_two: BackendContact;
};

type BackendParty = {
  id: number;
  party_datetime: string;
  location: BackendLocation;
  contact_one: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    contact_preference: "call" | "text";
    last_registered: string | null;
    pid: string;
  };
  contact_two: BackendContact;
};

export type { BackendParty, Party, StudentCreatePartyDTO };
