import type { Location } from "./location";
import type { Contact, Student } from "./student";

type Party = {
  id: number;
  datetime: Date;
  location: Location;
  contactOne: Student;
  contactTwo: Contact;
};

export type { Party };
