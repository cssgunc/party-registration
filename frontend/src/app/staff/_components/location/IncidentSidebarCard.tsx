import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IncidentDto } from "@/lib/api/location/location.types";
import { ChevronDown, MoreVertical } from "lucide-react";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
};
export default function IncidentSidebarCard({
  incidents,
}: IncidentSidebarProps) {
  return (
    <div>
      <Collapsible>
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex flex-row justify-between">
            <div className="flex gap-4">
              <ChevronDown className="mr-2" />
              <p className="text-md font-medium">
                {incidents[0].incident_datetime.toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                })}
              </p>
              <p className="text-md font-medium">
                {incidents[0].incident_datetime.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
            <MoreVertical />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="text-sm text-gray-500">
            {incidents[0].description || "No description provided."}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
