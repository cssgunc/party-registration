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
      title={"Info about the Party"}
      description={"View information on the Party you just clicked on"}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p className="p-2 border rounded">{d.location.formatted_address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Date</label>
            <p className="p-2 border rounded">
              {d.party_datetime.toDateString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">First name</label>
            <p className="p-2 border rounded">{d.contact_one.first_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p className="p-2 border rounded">{d.contact_one.last_name}</p>
          </div>
        </div>
      )}
    />
  );
}

export default PartyInfoChipDetails;
