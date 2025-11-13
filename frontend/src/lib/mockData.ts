import type { Account, PoliceAccount } from "@/types/api/account";
import type { Location } from "@/types/api/location";
import type { Party } from "@/types/api/party";
import type { Contact, Student } from "@/types/api/student";
import mockData from "@/../shared/mock_data.json";;

/**
 * Parses relative date strings like "NOW+7d" or "NOW-30d" into Date objects
 */
function parseRelativeDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/^NOW([+-])(\d+)d$/);
  if (!match) return null;

  const [, operator, days] = match;
  const date = new Date();
  const daysNum = parseInt(days, 10);

  if (operator === "+") {
    date.setDate(date.getDate() + daysNum);
  } else {
    date.setDate(date.getDate() - daysNum);
  }

  return date;
}

// Parse Police Account
export const POLICE_ACCOUNT: PoliceAccount = {
  email: mockData.police.email,
};

// Parse Accounts
export const ACCOUNTS: Account[] = mockData.accounts.map((acc) => ({
  id: acc.id,
  email: acc.email,
  pid: acc.pid,
  firstName: acc.first_name,
  lastName: acc.last_name,
  role: acc.role as "staff" | "admin" | "student",
}));

// Parse Students
export const STUDENTS: Student[] = mockData.students.map((student) => ({
  id: student.id,
  pid: student.pid,
  email: student.email,
  firstName: student.first_name,
  lastName: student.last_name,
  phoneNumber: student.phone_number,
  contactPreference: student.contact_preference as "call" | "text",
  lastRegistered: student.last_registered
    ? parseRelativeDate(student.last_registered)
    : null,
}));

// Parse Locations
export const LOCATIONS: Location[] = mockData.locations.map((loc) => ({
  id: loc.id,
  citationCount: loc.citation_count,
  warningCount: loc.warning_count,
  holdExpirationDate: parseRelativeDate(loc.hold_expiration),
  hasActiveHold: !!loc.hold_expiration,
  googlePlaceId: loc.google_place_id,
  formattedAddress: loc.formatted_address,
  latitude: loc.latitude,
  longitude: loc.longitude,
  streetNumber: loc.street_number,
  streetName: loc.street_name,
  unit: loc.unit,
  city: loc.city,
  county: loc.county,
  state: loc.state,
  country: loc.country,
  zipCode: loc.zip_code,
}));

// Helper to find student by ID
function findStudentById(id: number): Student {
  const student = STUDENTS.find((s) => s.id === id);
  if (!student) throw new Error(`Student with id ${id} not found`);
  return student;
}

// Helper to find location by ID
function findLocationById(id: number): Location {
  const location = LOCATIONS.find((l) => l.id === id);
  if (!location) throw new Error(`Location with id ${id} not found`);
  return location;
}

// Parse contact two objects
function parseContactTwo(
  contactData: typeof mockData["parties"][0]["contact_two"]
): Contact {
  return {
    email: contactData.email,
    firstName: contactData.first_name,
    lastName: contactData.last_name,
    phoneNumber: contactData.phone_number,
    contactPreference: contactData.contact_preference as "call" | "text",
  };
}

// Parse Parties
export const PARTIES: Party[] = mockData.parties.map((party) => ({
  id: party.id,
  datetime: parseRelativeDate(party.party_datetime) ?? new Date(),
  location: findLocationById(party.location_id),
  contactOne: findStudentById(party.contact_one_id),
  contactTwo: parseContactTwo(party.contact_two),
}));
