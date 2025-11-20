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
  const party_datetime = `${values.partyDate.toISOString().split("T")[0]}T${
    values.partyTime
  }:00`;

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
