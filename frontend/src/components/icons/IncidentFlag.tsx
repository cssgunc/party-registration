import { IncidentSeverity } from "@/lib/api/incident/incident.types";
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
  { className?: string; type: IncidentSeverity }
>(function IncidentFlag({ className, type, ...props }, ref) {
  return (
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
});

export default IncidentFlag;
