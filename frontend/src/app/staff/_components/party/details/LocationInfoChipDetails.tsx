"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { hasActiveHold } from "@/lib/api/location/location.service";
import {
  LocationDto,
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
} from "@/lib/api/location/location.types";

interface LocationInfoChipDetailsProps {
  data: LocationDto;
}

function LocationInfoChipDetails({ data }: LocationInfoChipDetailsProps) {
  return (
    <InfoChipDetails
      fields={[
        ["Address", data.formatted_address],
        ["In-Person Warning Count", getInPersonWarningCount(data)],
        ["Remote Warning Count", getRemoteWarningCount(data)],
        ["Citation Count", getCitationCount(data)],
        [
          "Active Hold",
          hasActiveHold(data.hold_expiration)
            ? "Active: Expires " + data.hold_expiration?.toDateString()
            : "No",
        ],
      ]}
    />
  );
}

export default LocationInfoChipDetails;
