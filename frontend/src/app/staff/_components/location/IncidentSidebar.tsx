import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { IncidentDto } from "@/lib/api/location/location.types";
import { useEffect, useState } from "react";
import IncidentModal from "./IncidentModal";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingIncident, setEditingIncident] = useState<
    IncidentDto | undefined
  >(undefined);

  useEffect(() => {
    setLocalIncidents(incidents);
  }, [incidents]);

  const handleDelete = (incidentId: number) => {
    setLocalIncidents((prev) => prev.filter((i) => i.id !== incidentId));
    onDeleteIncidentAction(incidentId);
  };

  const handleEdit = (incident: IncidentDto) => {
    setEditingIncident(incident);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingIncident(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleModalSubmit = (
    data: Omit<IncidentDto, "id" | "location_id"> & { incident_datetime: Date }
  ) => {
    if (modalMode === "create") {
      const nextId =
        localIncidents.length > 0
          ? Math.max(...localIncidents.map((i) => i.id)) + 1
          : Date.now();
      const locationId = localIncidents[0]?.location_id ?? 0;
      const newIncident: IncidentDto = {
        id: nextId,
        location_id: locationId,
        incident_datetime: data.incident_datetime,
        description: data.description,
        severity: data.severity,
      };
      setLocalIncidents((prev) => [newIncident, ...prev]);
    } else if (modalMode === "edit" && editingIncident) {
      setLocalIncidents((prev) =>
        prev.map((inc) =>
          inc.id === editingIncident.id
            ? {
                ...inc,
                incident_datetime: data.incident_datetime,
                description: data.description,
                severity: data.severity,
              }
            : inc
        )
      );
    }
    setModalOpen(false);
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
          onEditIncidentAction={handleEdit}
        />
      ))}
      {role === "admin" && (
        <Button variant="default" className="mt-4" onClick={handleAdd}>
          Add Incident
        </Button>
      )}

      <IncidentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        incident={editingIncident}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
