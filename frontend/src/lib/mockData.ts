import type { Account, PoliceAccount } from "@/types/api/account";
import type { Location } from "@/types/api/location";
import type { Student, Contact } from "@/types/api/student";
import type { Party } from "@/types/api/party";
// @ts-expect-error - JSON import without type definitions
import mockDataJson from "@/../shared/mock_data.json";

type MockDataJson = {
  police: {
    email: string;
    password: string;
    hashed_password: string;
  };
  accounts: Array<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  }>;
  students: Array<{
    id: number;
    pid: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    contact_preference: string;
    last_registered: string | null;
  }>;
  locations: Array<{
    id: number;
    citation_count: number;
    warning_count: number;
    hold_expiration_date: string | null;
    has_active_hold: boolean;
    google_place_id: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    street_number: string | null;
    street_name: string | null;
    unit: string | null;
    city: string | null;
    county: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;
  }>;
  parties: Array<{
    id: number;
    party_datetime: string;
    location_id: number;
    contact_one_id: number;
    contact_two: {
      email: string;
      first_name: string;
      last_name: string;
      phone_number: string;
      contact_preference: string;
    };
  }>;
};

const mockData = mockDataJson as MockDataJson;

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
export const policeAccount: PoliceAccount = {
  email: mockData.police.email,
};

// Parse Accounts
export const accounts: Account[] = mockData.accounts.map((acc) => ({
  id: acc.id,
  email: acc.email,
  firstName: acc.first_name,
  lastName: acc.last_name,
  role: acc.role as "staff" | "admin" | "student",
}));

// Parse Students
export const students: Student[] = mockData.students.map((student) => ({
  id: student.id,
  pid: student.pid,
  email: student.email,
  firstName: student.first_name,
  lastName: student.last_name,
  phoneNumber: student.phone_number,
  contactPreference: student.contact_preference as "call" | "text",
  lastRegistered: student.last_registered
    ? parseRelativeDate(student.last_registered)?.toISOString() ?? null
    : null,
}));

// Parse Locations
export const locations: Location[] = mockData.locations.map((loc) => ({
  id: loc.id,
  citationCount: loc.citation_count,
  warningCount: loc.warning_count,
  holdExpirationDate: parseRelativeDate(loc.hold_expiration_date),
  hasActiveHold: loc.has_active_hold,
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
  const student = students.find((s) => s.id === id);
  if (!student) throw new Error(`Student with id ${id} not found`);
  return student;
}

// Helper to find location by ID
function findLocationById(id: number): Location {
  const location = locations.find((l) => l.id === id);
  if (!location) throw new Error(`Location with id ${id} not found`);
  return location;
}

// Parse contact two objects
function parseContactTwo(contactData: MockDataJson["parties"][0]["contact_two"]): Contact {
  return {
    email: contactData.email,
    firstName: contactData.first_name,
    lastName: contactData.last_name,
    phoneNumber: contactData.phone_number,
    contactPreference: contactData.contact_preference as "call" | "text",
  };
}

// Parse Parties
export const parties: Party[] = mockData.parties.map((party) => ({
  id: party.id,
  datetime:
    parseRelativeDate(party.party_datetime)?.toISOString() ??
    new Date().toISOString(),
  location: findLocationById(party.location_id),
  contactOne: findStudentById(party.contact_one_id),
  contactTwo: parseContactTwo(party.contact_two),
}));
