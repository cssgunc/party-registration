import {
  INCIDENT_SEVERITY_LABELS,
  NestedIncidentStudentDto,
} from "@/lib/api/incident/incident.types";
import { formatTime } from "@/lib/utils";

type Props = {
  date: string;
  incidents: NestedIncidentStudentDto[];
};

/**
 * Renders a card showing all incidents recorded at the student's residence on a
 * given date, displaying each incident's time and severity label.
 */
function RegistrationIncidentCard({ date, incidents }: Props) {
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RegistrationIncidentCard;
