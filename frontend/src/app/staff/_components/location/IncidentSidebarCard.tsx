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
import { IncidentDto } from "@/lib/api/location/location.types";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";

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
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-2">
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log("Delete clicked")}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
