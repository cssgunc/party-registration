import getMockClient from "@/lib/network/mockClient";
import { Party } from "@/types/api/party";
import { AxiosInstance } from "axios";

interface BackendContact {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  contact_preference: "call" | "text";
}

interface BackendParty {
  id: number;
  party_datetime: string;
  location: {
    id: number;
    citation_count: number;
    warning_count: number;
    hold_expiration: string | null;
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
  };
  contact_one: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    contact_preference: "call" | "text";
    last_registered: string | null;
    pid: string;
  };
  contact_two: BackendContact;
}

export interface PaginatedPartiesResponse {
  items: Party[];
  total_records: number;
  page_size: number;
  page_number: number;
  total_pages: number;
}

/**
 * Payload for creating or updating a party from the admin UI.
 * This mirrors the AdminCreatePartyDTO shape on the backend.
 */
export interface AdminPartyPayload {
  type: "admin";
  party_datetime: string; // ISO string
  place_id: string;
  contact_one_email: string;
  contact_two: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    contact_preference: "call" | "text";
  };
}

function toFrontendParty(raw: BackendParty): Party {
  return {
    id: raw.id,
    datetime: new Date(raw.party_datetime),
    rawDatetime: raw.party_datetime,
    location: {
      id: raw.location.id,
      citationCount: raw.location.citation_count,
      warningCount: raw.location.warning_count,
      holdExpirationDate: raw.location.hold_expiration
        ? new Date(raw.location.hold_expiration)
        : null,
      hasActiveHold: raw.location.has_active_hold,
      googlePlaceId: raw.location.google_place_id,
      formattedAddress: raw.location.formatted_address,
      latitude: raw.location.latitude,
      longitude: raw.location.longitude,
      streetNumber: raw.location.street_number,
      streetName: raw.location.street_name,
      unit: raw.location.unit,
      city: raw.location.city,
      county: raw.location.county,
      state: raw.location.state,
      country: raw.location.country,
      zipCode: raw.location.zip_code,
    },
    contactOne: {
      id: raw.contact_one.id,
      email: raw.contact_one.email,
      firstName: raw.contact_one.first_name,
      lastName: raw.contact_one.last_name,
      phoneNumber: raw.contact_one.phone_number,
      contactPreference: raw.contact_one.contact_preference,
      lastRegistered: raw.contact_one.last_registered
        ? new Date(raw.contact_one.last_registered)
        : null,
      pid: raw.contact_one.pid,
    },
    contactTwo: {
      email: raw.contact_two.email,
      firstName: raw.contact_two.first_name,
      lastName: raw.contact_two.last_name,
      phoneNumber: raw.contact_two.phone_number,
      contactPreference: raw.contact_two.contact_preference,
    },
  };
}

const defaultClient = getMockClient("admin");

export class PartyService {
  private client: AxiosInstance;

  constructor(client: AxiosInstance = defaultClient) {
    this.client = client;
  }

  async listParties(
    pageNumber?: number,
    pageSize?: number
  ): Promise<PaginatedPartiesResponse> {
    const params: Record<string, number> = {};
    if (pageNumber !== undefined) params.page_number = pageNumber;
    if (pageSize !== undefined) params.page_size = pageSize;

    const response = await this.client.get<{
      items: BackendParty[];
      total_records: number;
      page_size: number;
      page_number: number;
      total_pages: number;
    }>("/parties", { params });

    return {
      ...response.data,
      items: response.data.items.map(toFrontendParty),
    };
  }

  async getParty(id: number): Promise<Party> {
    const response = await this.client.get<BackendParty>(`/parties/${id}`);
    return toFrontendParty(response.data);
  }

  async createParty(payload: AdminPartyPayload): Promise<Party> {
    const response = await this.client.post<BackendParty>("/parties", payload);
    return toFrontendParty(response.data);
  }

  async updateParty(id: number, payload: AdminPartyPayload): Promise<Party> {
    const response = await this.client.put<BackendParty>(
      `/parties/${id}`,
      payload
    );
    return toFrontendParty(response.data);
  }

  async deleteParty(id: number): Promise<Party> {
    const response = await this.client.delete<BackendParty>(`/parties/${id}`);
    return toFrontendParty(response.data);
  }
}
