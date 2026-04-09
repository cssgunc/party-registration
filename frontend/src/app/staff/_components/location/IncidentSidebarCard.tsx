"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IncidentDto } from "@/lib/api/incident/incident.types";
import { formatTime } from "@/lib/utils";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";

type IncidentSidebarCardProps = {
  incidents: IncidentDto;
  onDeleteIncidentAction: (incidentId: number) => void;
  onEditIncidentAction: (incident: IncidentDto) => void;
};
export default function IncidentSidebarCard({
  incidents,
  onDeleteIncidentAction,
  onEditIncidentAction,
}: IncidentSidebarCardProps) {
  const { data: session } = useSession();
  const role = session?.role;
  return (
    <div>
      <Collapsible>
        <CollapsibleTrigger className="w-full text-left group" asChild>
          <div className="flex flex-row justify-between">
            <div className="flex gap-4">
              <ChevronDown className="mr-2 cursor-pointer transition-transform duration-100 group-data-[state=open]:rotate-180" />
              <p className="text-md font-medium">
                {incidents.incident_datetime.toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                })}
              </p>
              <p className="text-md font-medium">
                {formatTime(incidents.incident_datetime)}
              </p>
            </div>
            {role === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-2">
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => onEditIncidentAction?.(incidents)}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteIncidentAction(incidents.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="text-sm">
            {incidents.description || "No description provided."}
            <br></br>
            <strong>Severity:</strong> {incidents.severity || "N/A"}
            <span>
              <br></br>
              <strong>Reference ID:</strong> {incidents.reference_id || "N/A"}
            </span>
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
