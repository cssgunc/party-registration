"use client";
import navyFlag from "@/components/icons/navyFlag.svg";
import redFlag from "@/components/icons/redFlag.svg";
import yellowFlag from "@/components/icons/yellowFlag.svg";
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
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { formatTime } from "@/lib/utils";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";

function getSeverityFlag(severity: IncidentSeverity) {
  if (severity === "remote_warning") return navyFlag;
  if (severity === "in_person_warning") return yellowFlag;
  return redFlag;
}
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
          <div>
            <div className="flex flex-row w-full items-center justify-left py-2">
              <div className="flex justify-between">
                <ChevronDown className="mr-2 cursor-pointer transition-transform duration-100 group-data-[state=open]:rotate-180" />
              </div>
              <div className="flex justify-between gap-10">
                <p className="content">
                  {new Date(incidents.incident_datetime).toLocaleDateString(
                    "en-US",
                    {
                      month: "2-digit",
                      day: "2-digit",
                    }
                  )}
                </p>
                <p className="content">
                  {formatTime(incidents.incident_datetime)}
                </p>
                <Image
                  src={getSeverityFlag(incidents.severity)}
                  alt={incidents.severity}
                  width={16}
                  height={16}
                />
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
            </div>
            <div className="border-t border-gray-300" />
          </div>
        </CollapsibleTrigger>
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
