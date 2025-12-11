"use client";

import { Party } from "@/lib/api/party/party.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface PartyInfoChipDetailsProps {
  data: Party;
}

export function PartyInfoChipDetails({ data }: PartyInfoChipDetailsProps) {
  return (
    <GenericChipDetails<Party>
      data={data}
      title={"Info about the Party"}
      description={"View information on the Party you just clicked on"}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p className="p-2 border rounded">{d.location.formattedAddress}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Date</label>
            <p className="p-2 border rounded">{d.datetime.toDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">First name</label>
            <p className="p-2 border rounded">{d.contactOne.firstName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p className="p-2 border rounded">{d.contactOne.lastName}</p>
          </div>
        </div>
      )}
    />
  );
}

export default PartyInfoChipDetails;
