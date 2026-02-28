import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { IncidentDto } from "@/lib/api/location/location.types";
import { useEffect, useState } from "react";
import IncidentSidebarCard from "./IncidentSidebarCard";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
  onDeleteIncidentAction: (incidentId: number) => void;
};

export default function IncidentSidebar({
  incidents,
  onDeleteIncidentAction,
}: IncidentSidebarProps) {
  const { role } = useRole();
  const [localIncidents, setLocalIncidents] =
    useState<IncidentDto[]>(incidents);

  useEffect(() => {
    setLocalIncidents(incidents);
  }, [incidents]);

  const handleDelete = (incidentId: number) => {
    setLocalIncidents((prev) => prev.filter((i) => i.id !== incidentId));
    onDeleteIncidentAction(incidentId);
  };

  return (
    <div>
      <h1 className="text-lg">Incidents</h1>
      <p className="text-sm text-gray-500">
        Manage the incidents for this location here.
      </p>
      {localIncidents.map((incident) => (
        <IncidentSidebarCard
          incidents={incident}
          key={incident.id}
          onDeleteIncidentAction={handleDelete}
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
