"use client";

import { hasActiveHold } from "@/lib/api/location/location.service";
import {
  LocationDto,
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
} from "@/lib/api/location/location.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface LocationInfoChipDetailsProps {
  data: LocationDto;
}

function LocationInfoChipDetails({ data }: LocationInfoChipDetailsProps) {
  return (
    <GenericChipDetails<LocationDto>
      data={data}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <p className="p-2">{d.formatted_address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              In-Person Warning Count
            </label>
            <p className="p-2">{getInPersonWarningCount(d)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Remote Warning Count
            </label>
            <p className="p-2">{getRemoteWarningCount(d)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Citation Count</label>
            <p className="p-2">{getCitationCount(d)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Active Hold</label>
            <p className="p-2">
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
