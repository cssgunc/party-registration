import { IncidentSeverity } from "@/lib/api/incident/incident.types";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";

const severityToColor: Record<IncidentSeverity, string> = {
  remote_warning: "fill-ocsl-navy",
  in_person_warning: "fill-ocsl-yellow",
  citation: "fill-ocsl-red",
};

export default function IncidentFlag({
  className,
  type,
}: {
  className?: string;
  type: IncidentSeverity;
}) {
  return (
    <Flag
      className={cn(
        severityToColor[type],
        "stroke-ocsl-navy stroke-3 size-4",
        className
      )}
    />
  );
}
