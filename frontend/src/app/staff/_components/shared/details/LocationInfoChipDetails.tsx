"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { LocationSummaryDto } from "@/lib/api/incident/incident.types";
import { hasActiveHold } from "@/lib/api/location/location.service";
import {
  LocationDto,
  getIncidentCounts,
} from "@/lib/api/location/location.types";
import { format } from "date-fns";

interface LocationInfoChipDetailsProps {
  data: LocationSummaryDto | LocationDto;
}

function LocationInfoChipDetails({ data }: LocationInfoChipDetailsProps) {
  const hasIncidents = "incidents" in data;
  const counts = hasIncidents ? getIncidentCounts(data) : null;
  const countFields: [string, number][] = counts
    ? [
        ["In-Person Warning Count", counts.in_person_warning],
        ["Remote Warning Count", counts.remote_warning],
        ["Citation Count", counts.citation],
      ]
    : [];
  return (
    <InfoChipDetails
      fields={[
        ["Address", data.formatted_address],
        ...countFields,
        [
          "Active Hold",
          hasActiveHold(data.hold_expiration)
            ? "Active: Expires " + format(data.hold_expiration!, "MMM d, yyyy")
            : "No",
        ],
      ]}
    />
  );
}

export default LocationInfoChipDetails;
