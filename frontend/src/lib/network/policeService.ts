import { Location } from "@/types/api/location";
import { Party } from "@/types/api/party";
import { Contact, Student } from "@/types/api/student";
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
  location: BackendLocation;
  contact_one: BackendStudent;
  contact_two: BackendContact;
}

interface PaginatedResponse<T> {
  items: T[];
  total_records: number;
  page_size: number;
  page_number: number;
  total_pages: number;
}

// Mapper functions
const mapBackendContact = (backendContact: BackendContact): Contact => ({
  email: backendContact.email,
  firstName: backendContact.first_name,
  lastName: backendContact.last_name,
  phoneNumber: backendContact.phone_number,
  contactPreference: backendContact.contact_preference,
});

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

const mapBackendParty = (backendParty: BackendParty): Party => ({
  id: backendParty.id,
  datetime: new Date(backendParty.party_datetime),
  location: mapBackendLocation(backendParty.location),
  contactOne: mapBackendStudent(backendParty.contact_one),
  contactTwo: mapBackendContact(backendParty.contact_two),
});

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

    const response = await policeClient.get<PaginatedResponse<BackendParty>>(
      "/parties",
      {
        params,
      }
    );

    console.log("Backend response:", response.data);

    // Extract items from paginated response
    const parties = response.data.items || [];

    // Filter out any null/undefined items and map
    return parties
      .filter((party) => party != null)
      .map((party) => {
        try {
          return mapBackendParty(party);
        } catch (error) {
          console.error("Error mapping party:", party, error);
          throw error;
        }
      });
  },

  /**
   * Get parties near a specific location within a radius
   */
  async getPartiesNearby(
    placeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Party[]> {
    const response = await policeClient.get<BackendParty[]>("/parties/nearby", {
      params: {
        place_id: placeId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
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
