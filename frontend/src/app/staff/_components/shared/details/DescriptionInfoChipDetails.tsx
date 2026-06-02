"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { IncidentDto } from "@/lib/api/incident/incident.types";

interface Props {
  data: IncidentDto;
}

function DescriptionInfoChipDetails({ data }: Props) {
  return (
    <InfoChipDetails
      fields={[["Description", data.description || "No description provided"]]}
    />
  );
}

export default DescriptionInfoChipDetails;
