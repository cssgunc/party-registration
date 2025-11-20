import type { Location } from "./location";
import type { Contact, Student } from "./student";

type Party = {
  id: number;
  datetime: Date;
  location: Location;
  contactOne: Student;
  contactTwo: Contact;
};

type StudentCreatePartyDTO = {
  type: "student";
  party_datetime: string; // ISO format
  place_id: string;
  contact_two: Contact;
};

export type { Party, StudentCreatePartyDTO };
