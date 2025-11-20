import type { Location } from "./location";
import type { Contact, Student } from "./student";

type Party = {
  id: number;
  datetime: Date;
  rawDatetime: string; // Original datetime string from backend (timezone-naive)
  location: Location;
  contactOne: Student;
  contactTwo: Contact;
};

export type { Party };
