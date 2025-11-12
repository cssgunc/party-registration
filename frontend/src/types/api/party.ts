import type { Location } from "./location";
import type { Student, Contact } from "./student";

type Party = {
  id: number;
  datetime: string;
  location: Location;
  contactOne: Student;
  contactTwo: Contact;
};

export type { Party };
