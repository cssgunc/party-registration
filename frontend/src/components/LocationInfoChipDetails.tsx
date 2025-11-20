"use client";

import { Location } from "@/types/api/location";
import { GenericChipDetails } from "./GenericChipDetails";

interface LocationInfoChipDetailsProps {
  data: Location;
}

function LocationInfoChipDetails({ data }: LocationInfoChipDetailsProps) {
  return (
    <GenericChipDetails<Location>
      data={data}
      title={"Info about the Location"}
      description={"View information on the Location you just clicked on"}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p className="p-2 border rounded">{d.formattedAddress}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Warning Count</label>
            <p className="p-2 border rounded">{d.warningCount}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Citation Count</label>
            <p className="p-2 border rounded">{d.citationCount}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Active Hold</label>
            <p className="p-2 border rounded">
              {d.hasActiveHold
                ? "Active: Expires " + d.holdExpirationDate?.toDateString()
                : "No"}
            </p>
          </div>
        </div>
      )}
    />
  );
}

export default LocationInfoChipDetails;
