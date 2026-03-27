import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { IncidentDto } from "@/lib/api/location/location.types";
import { LocationDto } from "@/lib/api/location/location.types";
import { PaginatedResponse } from "@/lib/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DeleteConfirmDialog } from "../shared/dialog/DeleteConfirmDialog";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import IncidentModal from "./IncidentModal";
import IncidentSidebarCard from "./IncidentSidebarCard";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
};

export default function IncidentInfoChipDetails({
  incidents,
}: IncidentSidebarProps) {
  const { role } = useRole();
  type ModalState =
    | { mode: "create" }
    | { mode: "edit"; incident: IncidentDto }
    | null;
  const [modalState, setModalState] = useState<ModalState>(null);
  const { openSidebar } = useSidebar();

  const [confirmStateDelete, setConfirmStateDelete] = useState<number | null>(
    null
  );

  const requestDelete = (incidentId: number) => {
    setConfirmStateDelete(incidentId);
  };

  const doDelete = () => {
    if (confirmStateDelete === null) return;
    const incident = incidents.find((i) => i.id === confirmStateDelete);
    if (!incident) return;
    queryClient.setQueryData<PaginatedResponse<LocationDto> | undefined>(
      ["locations"],
      (old) =>
        old
          ? {
              ...old,
              items: old.items.map((loc) =>
                loc.id === incident.location_id
                  ? {
                      ...loc,
                      incidents: loc.incidents.filter(
                        (inc) => inc.id !== confirmStateDelete
                      ),
                    }
                  : loc
              ),
            }
          : old
    );

    refreshSidebar(incident.location_id);
    setConfirmStateDelete(null);
  };

  const handleEdit = (incident: IncidentDto) => {
    setModalState({ mode: "edit", incident });
  };

  const handleAdd = () => {
    setModalState({ mode: "create" });
  };
  const closeModal = () => setModalState(null);
  const queryClient = useQueryClient();
  const refreshSidebar = (locationId: number) => {
    const updated = queryClient.getQueryData<PaginatedResponse<LocationDto>>([
      "locations",
    ]);

    const location = updated?.items.find((l) => l.id === locationId);

    if (!location) return;

    openSidebar(
      `incidents-${location.id}`,
      "Incidents at Location",
      "Warnings & Citations go here",
      <IncidentInfoChipDetails incidents={location.incidents} />
    );
  };
  const handleCreateIncident = (
    data: Omit<IncidentDto, "id" | "location_id"> & {
      incident_datetime: Date;
    }
  ) => {
    const locationId = incidents.length > 0 ? incidents[0].location_id : 0;

    const newIncident: IncidentDto = {
      id: Date.now(),
      location_id: locationId,
      incident_datetime: data.incident_datetime,
      description: data.description,
      severity: data.severity,
    };

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
                      incidents: [newIncident, ...loc.incidents],
                    }
                  : loc
              ),
            }
          : old
    );
    refreshSidebar(locationId);
    setModalState(null);
  };

  const handleEditIncident = (
    data: Omit<IncidentDto, "id" | "location_id"> & {
      incident_datetime: Date;
    }
  ) => {
    if (modalState?.mode !== "edit") return;

    const editingIncident = modalState.incident;

    queryClient.setQueryData<PaginatedResponse<LocationDto> | undefined>(
      ["locations"],
      (old) =>
        old
          ? {
              ...old,
              items: old.items.map((loc) =>
                loc.id === editingIncident.location_id
                  ? {
                      ...loc,
                      incidents: loc.incidents.map((inc) =>
                        inc.id === editingIncident.id
                          ? {
                              ...inc,
                              incident_datetime: data.incident_datetime,
                              description: data.description,
                              severity: data.severity,
                            }
                          : inc
                      ),
                    }
                  : loc
              ),
            }
          : old
    );

    refreshSidebar(editingIncident.location_id);

    setModalState(null);
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
          onDeleteIncidentAction={requestDelete}
          onEditIncidentAction={handleEdit}
        />
      ))}
      <DeleteConfirmDialog
        open={confirmStateDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmStateDelete(null);
          }
        }}
        onConfirm={doDelete}
        title="Delete Incident"
        description="Are you sure you want to delete this incident? This action cannot be undone."
      />
      {role === "admin" && (
        <Button variant="default" className="mt-4" onClick={handleAdd}>
          Add Incident
        </Button>
      )}

      <IncidentModal
        key={
          modalState?.mode === "edit"
            ? `edit-${modalState.incident.id}`
            : "create"
        }
        open={modalState !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        mode={modalState?.mode ?? "create"}
        incident={modalState?.mode === "edit" ? modalState.incident : undefined}
        onSubmit={
          modalState?.mode === "edit"
            ? handleEditIncident
            : handleCreateIncident
        }
      />
    </div>
  );
}
