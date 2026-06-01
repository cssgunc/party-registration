import {
  INCIDENT_SEVERITY_LABELS,
  NestedIncidentDto,
} from "@/lib/api/incident/incident.types";
import { formatTime } from "@/lib/utils";
import { memo } from "react";

type Props = {
  date: string;
  incidents: NestedIncidentDto[];
};

const RegistrationIncidentCard = memo(function RegistrationIncidentCard({
  date,
  incidents,
}: Props) {
  return (
    <div className="px-4 py-4 border-b border-gray-200 rounded-none">
      <div>
        <h2 className="content-bold">{date}</h2>
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id}>
              <p className="content">
                {formatTime(incident.incident_datetime)} -{" "}
                <span>{INCIDENT_SEVERITY_LABELS[incident.severity]}</span>
              </p>
              <p className="content ml-3 mt-1">{incident.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default RegistrationIncidentCard;
