import { Location } from "@/lib/api/location/location.types";
import { Party } from "@/lib/api/party/party.types";
import { Student } from "@/lib/api/student/student.types";
import getMockClient from "./mockClient";

const policeClient = getMockClient("police");

// Backend response types (snake_case)
interface BackendContact {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
}

interface BackendStudent extends BackendContact {
  id: number;
  pid: string;
  last_registered: string | null;
}

interface BackendLocation {
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
}

interface BackendParty {
  id: number;
  party_datetime: string;
  location_id: number;
  contact_one_id: number;
  contact_two_id: number;
}

interface BackendPartyExpanded {
  id: number;
  party_datetime: string;
  location: BackendLocation;
  contact_one: BackendStudent;
  contact_two: BackendStudent;
}

interface PaginatedResponse<T> {
  items: T[];
  total_records: number;
  page_size: number;
  page_number: number;
  total_pages: number;
}

// Mapper functions
const mapBackendStudent = (backendStudent: BackendStudent): Student => ({
  id: backendStudent.id,
  pid: backendStudent.pid,
  email: backendStudent.email,
  firstName: backendStudent.first_name,
  lastName: backendStudent.last_name,
  phoneNumber: backendStudent.phone_number,
  contactPreference: backendStudent.contact_preference,
  lastRegistered: backendStudent.last_registered
    ? new Date(backendStudent.last_registered)
    : null,
});

const mapBackendLocation = (backendLocation: BackendLocation): Location => ({
  id: backendLocation.id,
  citationCount: backendLocation.citation_count,
  warningCount: backendLocation.warning_count,
  holdExpirationDate: backendLocation.hold_expiration_date
    ? new Date(backendLocation.hold_expiration_date)
    : null,
  hasActiveHold: backendLocation.has_active_hold,
  googlePlaceId: backendLocation.google_place_id,
  formattedAddress: backendLocation.formatted_address,
  latitude: backendLocation.latitude,
  longitude: backendLocation.longitude,
  streetNumber: backendLocation.street_number,
  streetName: backendLocation.street_name,
  unit: backendLocation.unit,
  city: backendLocation.city,
  county: backendLocation.county,
  state: backendLocation.state,
  country: backendLocation.country,
  zipCode: backendLocation.zip_code,
});

const mapBackendParty = (
  backendParty: BackendParty | BackendPartyExpanded
): Party => {
  // Check if the party has expanded nested objects or just IDs
  const hasExpandedData =
    typeof (backendParty as BackendPartyExpanded).location === "object";

  if (hasExpandedData) {
    const expanded = backendParty as BackendPartyExpanded;
    return {
      id: expanded.id,
      datetime: new Date(expanded.party_datetime),
      location: mapBackendLocation(expanded.location),
      contactOne: mapBackendStudent(expanded.contact_one),
      contactTwo: mapBackendStudent(expanded.contact_two),
    };
  } else {
    // Backend only returned IDs - we need to create placeholder objects
    // This shouldn't happen in production, but handle gracefully
    const simple = backendParty as BackendParty;
    console.warn(
      "Backend returned Party with IDs only, not expanded objects:",
      simple
    );

    // Create minimal placeholder objects
    return {
      id: simple.id,
      datetime: new Date(simple.party_datetime),
      location: {
        id: simple.location_id,
        citationCount: 0,
        warningCount: 0,
        holdExpirationDate: null,
        hasActiveHold: false,
        googlePlaceId: "",
        formattedAddress: `Location ID: ${simple.location_id}`,
        latitude: 0,
        longitude: 0,
        streetNumber: null,
        streetName: null,
        unit: null,
        city: null,
        county: null,
        state: null,
        country: null,
        zipCode: null,
      },
      contactOne: {
        id: simple.contact_one_id,
        pid: "",
        email: "",
        firstName: "Contact",
        lastName: `${simple.contact_one_id}`,
        phoneNumber: "",
        contactPreference: "text",
        lastRegistered: null,
      },
      contactTwo: {
        email: "",
        firstName: "Contact",
        lastName: `${simple.contact_two_id}`,
        phoneNumber: "",
        contactPreference: "text",
      },
    };
  }
};

// Service functions
export const policeService = {
  /**
   * Get all parties with optional date range filtering
   */
  async getParties(startDate?: Date, endDate?: Date): Promise<Party[]> {
    const params: Record<string, string> = {};

    if (startDate) {
      params.start_date = startDate.toISOString();
    }

    if (endDate) {
      params.end_date = endDate.toISOString();
    }

    const response = await policeClient.get<
      PaginatedResponse<BackendParty | BackendPartyExpanded>
    >("/parties", {
      params,
    });

    // Extract items from paginated response
    const parties = response.data.items || [];

    // Filter out any null/undefined items and map
    return parties.filter((party) => party != null).map(mapBackendParty);
  },
  /**
   * Get parties near a specific location within 0.5 mile radius
   */
  async getPartiesNearby(
    placeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Party[]> {
    // Backend expects YYYY-MM-DD format
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    const response = await policeClient.get<BackendParty[]>("/parties/nearby", {
      params: {
        place_id: placeId,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      },
    });

    return response.data.map(mapBackendParty);
  },

  /**
   * Issue a warning to a location
   */
  async issueWarning(locationId: number): Promise<void> {
    await policeClient.post(`/locations/${locationId}/warnings`);
  },

  /**
   * Issue a citation to a location
   */
  async issueCitation(locationId: number): Promise<void> {
    await policeClient.post(`/locations/${locationId}/citations`);
  },
};
