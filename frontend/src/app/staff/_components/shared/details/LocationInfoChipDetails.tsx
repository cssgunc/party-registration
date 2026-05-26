"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { LocationSummaryDto } from "@/lib/api/incident/incident.types";
import { hasActiveHold } from "@/lib/api/location/location.service";
import {
  LocationDto,
  getCitationCount,
  getInPersonWarningCount,
  getRemoteWarningCount,
} from "@/lib/api/location/location.types";

interface LocationInfoChipDetailsProps {
  data: LocationSummaryDto | LocationDto;
}

function LocationInfoChipDetails({ data }: LocationInfoChipDetailsProps) {
  const hasIncidents = "incidents" in data;
  return (
    <InfoChipDetails
      fields={[
        ["Address", data.formatted_address],
        ...(hasIncidents
          ? [
              ["In-Person Warning Count", getInPersonWarningCount(data)] as [
                string,
                number,
              ],
              ["Remote Warning Count", getRemoteWarningCount(data)] as [
                string,
                number,
              ],
              ["Citation Count", getCitationCount(data)] as [string, number],
            ]
          : []),
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
