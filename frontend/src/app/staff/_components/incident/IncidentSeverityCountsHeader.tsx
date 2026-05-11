import IncidentFlag from "@/components/icons/IncidentFlag";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  IncidentSeverityCounts,
} from "@/lib/api/incident/incident.types";

export function IncidentSeverityCountsHeader({
  counts,
  isLoading,
}: {
  counts?: IncidentSeverityCounts;
  isLoading?: boolean;
}) {
  return (
    <div className="@container w-full flex items-center gap-6">
      {INCIDENT_SEVERITIES.map((severity) => (
        <div
          key={severity}
          className="flex items-center gap-2 text-sm whitespace-nowrap"
        >
          <IncidentFlag type={severity} />
          <span className="hidden @md:inline">
            {INCIDENT_SEVERITY_LABELS[severity]}s
          </span>
          {isLoading || !counts ? (
            <Skeleton className="h-4 w-6" />
          ) : (
            <span className="font-medium tabular-nums">{counts[severity]}</span>
          )}
        </div>
      ))}
    </div>
  );
}
