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

type IncidentSidebarCardProps = {
  incident: NestedIncidentDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteIncidentAction: (incidentId: number) => void;
  onEditIncidentAction: (incident: NestedIncidentDto) => void;
};

function IncidentSidebarCard({
  incident,
  open,
  onOpenChange,
  onDeleteIncidentAction,
  onEditIncidentAction,
}: IncidentSidebarCardProps) {
  const { data: session } = useSession();
  const role = session?.role;
  return (
    <div>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div>
          <div className="flex flex-row w-full items-center justify-left py-2 px-2 rounded cursor-pointer hover:bg-muted transition-colors">
            <CollapsibleTrigger className="flex-1 text-left group" asChild>
              <div className="flex items-center">
                <ChevronDown className="mr-2 size-4 transition-transform duration-100 group-data-[state=open]:rotate-180" />
                <div className="flex items-center gap-10">
                  <p className="text-sm whitespace-nowrap">
                    {format(incident.incident_datetime, "MM/dd/yy")}
                  </p>
                  <p className="text-sm w-20 whitespace-nowrap">
                    {formatTime(incident.incident_datetime)}
                  </p>
                  <IncidentFlag type={incident.severity} hoverCard />
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
                    onClick={() => onEditIncidentAction?.(incident)}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteIncidentAction(incident.id)}
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
              Reference ID: {incident.reference_id || "None"}
            </p>
            {incident.description ? (
              <p className="text-sm">Description: {incident.description}</p>
            ) : (
              <p className="text-sm italic">No description provided.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default IncidentSidebarCard;
