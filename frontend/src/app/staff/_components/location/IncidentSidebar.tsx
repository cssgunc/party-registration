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
  onDeleteIncidentAction: (incidentId: number) => void;
};

export default function IncidentSidebar({
  incidents,
  onDeleteIncidentAction,
}: IncidentSidebarProps) {
  const { role } = useRole();
  type ModalState =
    | { mode: "create" }
    | { mode: "edit"; incident: IncidentDto }
    | null;
  const [modalState, setModalState] = useState<ModalState>(null);
  const { openSidebar } = useSidebar();

  const [confirmState, setConfirmState] = useState<number | null>(null);

  const requestDelete = (incidentId: number) => {
    setConfirmState(incidentId);
  };

  const handleDelete = (incidentId: number) => {
    const incident = incidents.find((i) => i.id === incidentId);
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

    const location = updated?.items.find((l) => l.id === incident.location_id);

    if (!location) return;

    openSidebar(
      `incidents-${location.id}`,
      "Incidents at Location",
      "Warnings & Citations go here",
      <IncidentSidebar
        incidents={location.incidents}
        onDeleteIncidentAction={onDeleteIncidentAction}
      />
    );
  };

  const doDelete = () => {
    if (confirmState !== null) {
      handleDelete(confirmState);
    }
    setConfirmState(null);
  };

  const handleEdit = (incident: IncidentDto) => {
    setModalState({ mode: "edit", incident });
  };

  const handleAdd = () => {
    setModalState({ mode: "create" });
  };
  const closeModal = () => setModalState(null);
  const queryClient = useQueryClient();

  const handleModalSubmit = (
    data: Omit<IncidentDto, "id" | "location_id"> & {
      incident_datetime: Date;
    }
  ) => {
    if (modalState?.mode === "create") {
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
    } else if (modalState?.mode === "edit") {
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
      const updated = queryClient.getQueryData<PaginatedResponse<LocationDto>>([
        "locations",
      ]);

      const location = updated?.items.find(
        (l) => l.id === editingIncident.location_id
      );

      if (!location) return;

      openSidebar(
        `incidents-${location.id}`,
        "Incidents at Location",
        "Warnings & Citations go here",
        <IncidentSidebar
          incidents={location.incidents}
          onDeleteIncidentAction={onDeleteIncidentAction}
        />
      );
    }

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
        open={confirmState !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState(null);
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
        open={modalState !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        mode={modalState?.mode ?? "create"}
        incident={modalState?.mode === "edit" ? modalState.incident : undefined}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
