import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  INCIDENT_SEVERITY_LABELS,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";
import { forwardRef } from "react";

const severityToColor: Record<IncidentSeverity, string> = {
  remote_warning: "fill-ocsl-navy",
  in_person_warning: "fill-ocsl-yellow",
  citation: "fill-ocsl-red",
};

const IncidentFlag = forwardRef<
  SVGSVGElement,
  { className?: string; type: IncidentSeverity; hoverCard?: boolean }
>(function IncidentFlag({ className, type, hoverCard, ...props }, ref) {
  const flag = (
    <Flag
      ref={ref}
      className={cn(
        severityToColor[type],
        "stroke-ocsl-navy stroke-3 size-4",
        className
      )}
      {...props}
    />
  );

  if (!hoverCard) return flag;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{flag}</HoverCardTrigger>
      <HoverCardContent>
        <p>{INCIDENT_SEVERITY_LABELS[type]}</p>
      </HoverCardContent>
    </HoverCard>
  );
});

export default IncidentFlag;
