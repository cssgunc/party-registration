import { PartyFormValues } from "@/components/PartyRegistrationForm";
import apiClient from "@/lib/network/apiClient";
import { StudentCreatePartyDTO } from "@/types/api/party";
import { AxiosInstance } from "axios";

export class PartyService {
  constructor(private client: AxiosInstance = apiClient) {}

  async createStudentParty(values: PartyFormValues, placeId: string) {
    const dto = mapFormToStudentDTO(values, placeId);

    const response = await this.client.post("/parties", dto);

    return response.data;
  }
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
      first_name: values.secondContactFirstName, // FIXED
      last_name: values.secondContactLastName, // FIXED
      phone_number: values.phoneNumber, // FIXED
      contact_preference: values.contactPreference, // FIXED
    },
  };
}
