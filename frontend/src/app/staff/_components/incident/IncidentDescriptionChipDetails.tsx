"use client";

import { IncidentDto } from "@/lib/api/incident/incident.types";
import { GenericChipDetails } from "../shared/sidebar/GenericChipDetails";

interface IncidentDescriptionChipDetailsProps {
  data: IncidentDto;
}

function IncidentDescriptionChipDetails({
  data,
}: IncidentDescriptionChipDetailsProps) {
  return (
    <GenericChipDetails<IncidentDto>
      data={data}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <p>{d.description || "No description provided"}</p>
          </div>
        </div>
      )}
    />
  );
}

export default IncidentDescriptionChipDetails;
