import IncidentFlag from "@/components/icons/IncidentFlag";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IncidentSeverity,
  IncidentSeverityCounts,
} from "@/lib/api/incident/incident.types";

const SEVERITY_DISPLAY: { severity: IncidentSeverity; label: string }[] = [
  { severity: "remote_warning", label: "Remote Warnings" },
  { severity: "in_person_warning", label: "In-Person Warnings" },
  { severity: "citation", label: "Citations" },
];

export function IncidentSeverityCountsHeader({
  counts,
  isLoading,
}: {
  counts?: IncidentSeverityCounts;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      {SEVERITY_DISPLAY.map(({ severity, label }) => (
        <div
          key={severity}
          className="flex items-center gap-2 text-sm whitespace-nowrap"
        >
          <IncidentFlag type={severity} />
          <span className="text-muted-foreground">{label}</span>
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
