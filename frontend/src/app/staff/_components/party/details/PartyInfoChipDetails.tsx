"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { PartyDto } from "@/lib/api/party/party.types";

interface PartyInfoChipDetailsProps {
  data: PartyDto;
}

export function PartyInfoChipDetails({ data }: PartyInfoChipDetailsProps) {
  return (
    <InfoChipDetails
      fields={[
        ["Address", data.location.formatted_address],
        ["Date", data.party_datetime.toDateString()],
        ["First Name", data.contact_one.first_name],
        ["Last Name", data.contact_one.last_name],
      ]}
    />
  );
}

export default PartyInfoChipDetails;
