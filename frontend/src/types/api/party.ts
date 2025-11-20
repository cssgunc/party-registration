import type { Location } from "./location";
import type { Contact, ContactAPI, Student } from "./student";

/**
 * Party data from the API
 */
type PartyAPI = {
  id: number;
  party_datetime: string; // ISO format
  location: Location;
  contact_one: Student;
  contact_two: ContactAPI;
};

/**
 * Party data for frontend use (with camelCase and Date objects)
 */
type Party = {
  id: number;
  datetime: Date;
  rawDatetime: string; // Original datetime string from backend (timezone-naive)
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
  contact_two: ContactAPI;
};

export type { Party, PartyAPI, StudentCreatePartyDTO };
