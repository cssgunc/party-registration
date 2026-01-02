"use client";

import { hasActiveHold } from "@/lib/api/location/location.service";
import { LocationDto } from "@/lib/api/location/location.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface LocationInfoChipDetailsProps {
  data: LocationDto;
}

function LocationInfoChipDetails({ data }: LocationInfoChipDetailsProps) {
  return (
    <GenericChipDetails<LocationDto>
      data={data}
      title={"Info about the Location"}
      description={"View information on the Location you just clicked on"}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p className="p-2 border rounded">{d.formatted_address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Warning Count</label>
            <p className="p-2 border rounded">{d.warning_count}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Citation Count</label>
            <p className="p-2 border rounded">{d.citation_count}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Active Hold</label>
            <p className="p-2 border rounded">
              {hasActiveHold(d.hold_expiration)
                ? "Active: Expires " + d.hold_expiration?.toDateString()
                : "No"}
            </p>
          </div>
        </div>
      )}
    />
  );
}

export default LocationInfoChipDetails;
