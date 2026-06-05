"use client";
import IncidentFlag from "@/components/icons/IncidentFlag";
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
import { NestedIncidentDto } from "@/lib/api/incident/incident.types";
import { formatTime } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { memo } from "react";

type IncidentSidebarCardProps = {
  incidents: NestedIncidentDto;
  onDeleteIncidentAction: (incidentId: number) => void;
  onEditIncidentAction: (incident: NestedIncidentDto) => void;
};
const IncidentSidebarCard = memo(function IncidentSidebarCard({
  incidents,
  onDeleteIncidentAction,
  onEditIncidentAction,
}: IncidentSidebarCardProps) {
  const { data: session } = useSession();
  const role = session?.role;
  return (
    <div>
      <Collapsible>
        <div>
          <div className="flex flex-row w-full items-center justify-left py-2 px-2 rounded cursor-pointer hover:bg-muted transition-colors">
            <CollapsibleTrigger className="flex-1 text-left group" asChild>
              <div className="flex items-center">
                <ChevronDown className="mr-2 size-4 transition-transform duration-100 group-data-[state=open]:rotate-180" />
                <div className="flex items-center gap-10">
                  <p className="text-sm whitespace-nowrap">
                    {format(incidents.incident_datetime, "MM/dd")}
                  </p>
                  <p className="text-sm w-20 whitespace-nowrap">
                    {formatTime(incidents.incident_datetime)}
                  </p>
                  <IncidentFlag type={incidents.severity} hoverCard />
                </div>
              </div>
            </CollapsibleTrigger>
            {role === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="ml-2"
                  aria-label="Incident options"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => onEditIncidentAction?.(incidents)}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteIncidentAction(incidents.id)}
                    variant="destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="border-t border-gray-300" />
        </div>
        <CollapsibleContent>
          <div className="py-2 px-6">
            <p className="text-sm italic">
              Reference ID: {incidents.reference_id || "None"}
            </p>
            {incidents.description ? (
              <p className="text-sm">Description: {incidents.description}</p>
            ) : (
              <p className="text-sm italic">No description provided.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

export default IncidentSidebarCard;
