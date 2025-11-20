import { PartyFormValues } from "@/components/PartyRegistrationForm";
import apiClient from "@/lib/network/apiClient";
import { Party, PartyAPI, StudentCreatePartyDTO } from "@/types/api/party";
import { AxiosInstance } from "axios";

export class PartyService {
  constructor(private client: AxiosInstance = apiClient) {}

  async createStudentParty(
    values: PartyFormValues,
    placeId: string
  ): Promise<Party> {
    const dto = mapFormToStudentDTO(values, placeId);

    const response = await this.client.post<PartyAPI>("/parties", dto);

    return transformPartyAPIToParty(response.data);
  }
}

/**
 * Transform API party data to frontend format
 */
function transformPartyAPIToParty(apiParty: PartyAPI): Party {
  return {
    id: apiParty.id,
    datetime: new Date(apiParty.party_datetime),
    location: apiParty.location,
    contactOne: apiParty.contact_one,
    contactTwo: {
      email: apiParty.contact_two.email,
      firstName: apiParty.contact_two.first_name,
      lastName: apiParty.contact_two.last_name,
      phoneNumber: apiParty.contact_two.phone_number,
      contactPreference: apiParty.contact_two.contact_preference,
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
