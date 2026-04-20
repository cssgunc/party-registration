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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { IncidentDto } from "@/lib/api/incident/incident.types";
import { formatTime } from "@/lib/utils";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
        <div>
          <div className="flex flex-row w-full items-center justify-left py-2 rounded cursor-pointer hover:bg-muted transition-colors">
            <CollapsibleTrigger className="flex-1 text-left group" asChild>
              <div className="flex items-center">
                <ChevronDown className="mr-2 transition-transform duration-100 group-data-[state=open]:rotate-180" />
                <div className="flex items-center gap-10">
                  <p className="content whitespace-nowrap">
                    {new Date(incidents.incident_datetime).toLocaleDateString(
                      "en-US",
                      {
                        month: "2-digit",
                        day: "2-digit",
                      }
                    )}
                  </p>
                  <p className="content w-20 whitespace-nowrap">
                    {formatTime(incidents.incident_datetime)}
                  </p>
                  <HoverCard openDelay={0} closeDelay={4}>
                    <HoverCardTrigger asChild>
                      <IncidentFlag type={incidents.severity} />
                    </HoverCardTrigger>
                    <HoverCardContent>
                      <p>
                        {incidents.severity === "remote_warning" &&
                          "Remote Warning"}
                        {incidents.severity === "in_person_warning" &&
                          "In-Person Warning"}
                        {incidents.severity === "citation" && "Citation"}
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>
            </CollapsibleTrigger>
            {role === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-2">
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => onEditIncidentAction?.(incidents)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteIncidentAction(incidents.id)}
                    variant="destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
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
            <p className="content italic">
              Reference ID: {incidents.reference_id || "None"}
            </p>
            {incidents.description ? (
              <p className="content">{incidents.description}</p>
            ) : (
              <p className="content italic">No description provided.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
