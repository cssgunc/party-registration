import type { Location } from "./location";
import type { Student } from "./student";

type Party = {
  id: number;
  datetime: Date;
  location: Location;
  contact_one: Student;
  contact_two: Student;
};

type PartyData = {
  datetime: Date;
  location: Location;
  contact_one: Student;
  contact_two: Student;
};

export type { Party, PartyData };
