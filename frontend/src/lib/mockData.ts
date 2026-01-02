import mockData from "@/../shared/mock_data.json";
import type { AccountDto } from "@/lib/api/account/account.types";
import { LocationDto } from "./api/location/location.types";
import { ContactDto, PartyDto } from "./api/party/party.types";
import { PoliceAccountDto } from "./api/police/police.types";
import { StudentDto } from "./api/student/student.types";

/**
 * Parses relative date strings like "NOW+7d", "NOW-30d", "NOW+4h", or "NOW-2h" into Date objects
 */
function parseRelativeDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/^NOW([+-])(\d+)([dh])$/);
  if (!match) return null;

  const [, operator, amount, unit] = match;
  const date = new Date();
  const amountNum = parseInt(amount, 10);

  if (unit === "d") {
    // Days
    if (operator === "+") {
      date.setDate(date.getDate() + amountNum);
    } else {
      date.setDate(date.getDate() - amountNum);
    }
  } else if (unit === "h") {
    // Hours
    if (operator === "+") {
      date.setHours(date.getHours() + amountNum);
    } else {
      date.setHours(date.getHours() - amountNum);
    }
  }

  return date;
}

// Parse Police Account
export const POLICE_ACCOUNT: PoliceAccountDto = {
  email: mockData.police.email,
};

// Parse Accounts
export const ACCOUNTS: AccountDto[] = mockData.accounts.map((acc) => ({
  id: acc.id,
  email: acc.email,
  pid: acc.pid,
  first_name: acc.first_name,
  last_name: acc.last_name,
  role: acc.role as "staff" | "admin" | "student",
}));

// Parse Students
export const STUDENTS: StudentDto[] = mockData.students.map((student) => ({
  id: student.id,
  pid: student.pid,
  email: student.email,
  first_name: student.first_name,
  last_name: student.last_name,
  phone_number: student.phone_number,
  contact_preference: student.contact_preference as "call" | "text",
  last_registered: student.last_registered
    ? parseRelativeDate(student.last_registered)
    : null,
}));

// Parse Locations
export const LOCATIONS: LocationDto[] = mockData.locations.map((loc) => ({
  id: loc.id,
  citation_count: loc.citation_count,
  warning_count: loc.warning_count,
  hold_expiration: parseRelativeDate(loc.hold_expiration),
  google_place_id: loc.google_place_id,
  formatted_address: loc.formatted_address,
  latitude: loc.latitude,
  longitude: loc.longitude,
  street_number: loc.street_number,
  street_name: loc.street_name,
  unit: loc.unit,
  city: loc.city,
  county: loc.county,
  state: loc.state,
  country: loc.country,
  zip_code: loc.zip_code,
  complaints: [],
}));

// Helper to find student by ID
function findStudentById(id: number): StudentDto {
  const student = STUDENTS.find((s) => s.id === id);
  if (!student) throw new Error(`Student with id ${id} not found`);
  return student;
}

// Helper to find location by ID
function findLocationById(id: number): LocationDto {
  const location = LOCATIONS.find((l) => l.id === id);
  if (!location) throw new Error(`Location with id ${id} not found`);
  return location;
}

// Parse contact two objects
function parseContactTwo(
  contactData: (typeof mockData)["parties"][0]["contact_two"]
): ContactDto {
  return {
    email: contactData.email,
    first_name: contactData.first_name,
    last_name: contactData.last_name,
    phone_number: contactData.phone_number,
    contact_preference: contactData.contact_preference as "call" | "text",
  };
}

// Parse Parties
export const PARTIES: PartyDto[] = mockData.parties.map((party) => ({
  id: party.id,
  party_datetime: parseRelativeDate(party.party_datetime) ?? new Date(),
  location: findLocationById(party.location_id),
  contact_one: findStudentById(party.contact_one_id),
  contact_two: parseContactTwo(party.contact_two),
}));
