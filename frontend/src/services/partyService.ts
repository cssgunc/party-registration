import { PartyFormValues } from "@/components/PartyRegistrationForm";
import getMockClient from "@/lib/network/mockClient";
import { BackendParty, Party, StudentCreatePartyDTO } from "@/types/api/party";
import { AxiosInstance } from "axios";
import { toFrontendStudent } from "./adminStudentService";
import { toFrontendLocation } from "./locationService";

/**
 * Transform API party data to frontend format
 */
export function toFrontendParty(backendParty: BackendParty): Party {
  return {
    id: backendParty.id,
    datetime: new Date(backendParty.party_datetime),
    location: toFrontendLocation(backendParty.location),
    contactOne: toFrontendStudent(backendParty.contact_one),
    contactTwo: {
      email: backendParty.contact_two.email,
      firstName: backendParty.contact_two.first_name,
      lastName: backendParty.contact_two.last_name,
      phoneNumber: backendParty.contact_two.phone_number,
      contactPreference: backendParty.contact_two.contact_preference,
    },
  };
}

function mapFormToStudentDTO(
  values: PartyFormValues,
  placeId: string
): StudentCreatePartyDTO {
  const date = values.partyDate; // Date object
  const [hours, minutes] = values.partyTime.split(":");

  // Set the time
  date.setHours(Number(hours), Number(minutes), 0, 0);

  // produce offset-aware ISO string
  const party_datetime = date.toISOString();

  return {
    type: "student",
    party_datetime,
    place_id: placeId,
    contact_two: {
      email: values.contactTwoEmail,
      first_name: values.secondContactFirstName,
      last_name: values.secondContactLastName,
      phone_number: values.phoneNumber,
      contact_preference: values.contactPreference,
    },
  };
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
export interface BackendAdminPartyPayload {
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

export interface AdminPartyPayload {
  type: "admin";
  partyDatetime: Date;
  placeId: string;
  contactOneEmail: string;
  contactTwo: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    contactPreference: "call" | "text";
  };
}

function toBackendPayload(
  payload: AdminPartyPayload
): BackendAdminPartyPayload {
  return {
    type: "admin",
    party_datetime: payload.partyDatetime.toISOString(),
    place_id: payload.placeId,
    contact_one_email: payload.contactOneEmail,
    contact_two: {
      email: payload.contactTwo.email,
      first_name: payload.contactTwo.firstName,
      last_name: payload.contactTwo.lastName,
      phone_number: payload.contactTwo.phoneNumber,
      contact_preference: payload.contactTwo.contactPreference,
    },
  };
}

const defaultClient = getMockClient("admin");

export class PartyService {
  private client: AxiosInstance;

  constructor(client: AxiosInstance = defaultClient) {
    this.client = client;
  }

  async createStudentParty(
    values: PartyFormValues,
    placeId: string
  ): Promise<Party> {
    const dto = mapFormToStudentDTO(values, placeId);

    const response = await this.client.post<BackendParty>("/parties", dto);

    return toFrontendParty(response.data);
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
    const backendPayload = toBackendPayload(payload);
    const response = await this.client.post<BackendParty>("/parties", backendPayload);
    return toFrontendParty(response.data);
  }

  async updateParty(
    id: number,
    payload: AdminPartyPayload
  ): Promise<Party> {
    const backendPayload = toBackendPayload(payload);
    const response = await this.client.put<BackendParty>(
      `/parties/${id}`,
      backendPayload
    );
    return toFrontendParty(response.data);
  }

  async deleteParty(id: number): Promise<Party> {
    const response = await this.client.delete<BackendParty>(`/parties/${id}`);
    return toFrontendParty(response.data);
  }
}
