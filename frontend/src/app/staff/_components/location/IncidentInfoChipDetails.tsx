"use client";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { IncidentDto, LocationDto } from "@/lib/api/location/location.types";
import { PaginatedResponse } from "@/lib/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import IncidentSidebarCard from "./IncidentSidebarCard";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
  locationId: number;
};

export default function IncidentInfoChipDetails({
  incidents,
  locationId,
}: IncidentSidebarProps) {
  const { role } = useRole();

  const queryClient = useQueryClient();
  const { openSidebar } = useSidebar();
  const handleDelete = (incidentId: number) => {
    queryClient.setQueryData<PaginatedResponse<LocationDto> | undefined>(
      ["locations"],
      (old) =>
        old
          ? {
              ...old,
              items: old.items.map((loc) =>
                loc.id === locationId
                  ? {
                      ...loc,
                      incidents: loc.incidents.filter(
                        (inc) => inc.id !== incidentId
                      ),
                    }
                  : loc
              ),
            }
          : old
    );

    const updated = queryClient.getQueryData<PaginatedResponse<LocationDto>>([
      "locations",
    ]);

    const location = updated?.items.find((l) => l.id === locationId);

    if (!location) return;

    openSidebar(
      `incidents-${locationId}`,
      "Incidents at Location",
      "Warnings & Citations go here",
      <IncidentInfoChipDetails
        incidents={location.incidents}
        locationId={locationId}
      />
    );
  };

  return (
    <div>
      <h1 className="text-lg">Incidents</h1>
      <p className="text-sm text-gray-500">
        Manage the incidents for this location here.
      </p>
      {incidents.map((incident) => (
        <IncidentSidebarCard
          incidents={incident}
          key={incident.id}
          onDeleteAction={handleDelete}
        />
      ))}
      {role === "admin" && (
        <Button variant="default" className="mt-4">
          Add Incident
        </Button>
      )}
    </div>
  );
}
