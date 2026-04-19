"use client";

import { PartyDto } from "@/lib/api/party/party.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface PartyInfoChipDetailsProps {
  data: PartyDto;
}

export function PartyInfoChipDetails({ data }: PartyInfoChipDetailsProps) {
  return (
    <GenericChipDetails<PartyDto>
      data={data}
      renderView={(d) => (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p>{d.location.formatted_address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Date</label>
            <p>{d.party_datetime.toDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">First name</label>
            <p>{d.contact_one.first_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p>{d.contact_one.last_name}</p>
          </div>
        </div>
      )}
    />
  );
}

export default PartyInfoChipDetails;
