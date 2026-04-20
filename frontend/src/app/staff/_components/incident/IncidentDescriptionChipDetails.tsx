"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { IncidentDto } from "@/lib/api/incident/incident.types";

interface IncidentDescriptionChipDetailsProps {
  data: IncidentDto;
}

function IncidentDescriptionChipDetails({
  data,
}: IncidentDescriptionChipDetailsProps) {
  return (
    <InfoChipDetails
      fields={[["Description", data.description || "No description provided"]]}
    />
  );
}

export default IncidentDescriptionChipDetails;
