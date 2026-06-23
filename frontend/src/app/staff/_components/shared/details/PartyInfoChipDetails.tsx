"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { PartyDto } from "@/lib/api/party/party.types";
import { format } from "date-fns";

interface PartyInfoChipDetailsProps {
  data: PartyDto;
}

/** Sidebar detail panel showing address, date, and first contact name for a party. */
export function PartyInfoChipDetails({ data }: PartyInfoChipDetailsProps) {
  return (
    <InfoChipDetails
      fields={[
        ["Address", data.location.formatted_address],
        ["Date", format(data.party_datetime, "MMM d, yyyy")],
        ["First Name", data.contact_one.first_name],
        ["Last Name", data.contact_one.last_name],
      ]}
    />
  );
}

export default PartyInfoChipDetails;
