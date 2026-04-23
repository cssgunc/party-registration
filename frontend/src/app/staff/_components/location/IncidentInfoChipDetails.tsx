import IncidentDialog from "@/components/IncidentDialog";
import { Button } from "@/components/ui/button";
import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import { IncidentCreateDto } from "@/lib/api/incident/incident.types";
import {
  LOCATIONS_KEY,
  useDeleteIncidentInLocation,
  useUpdateIncidentInLocation,
} from "@/lib/api/location/location.queries";
import { IncidentDto, LocationDto } from "@/lib/api/location/location.types";
import { PaginatedResponse } from "@/lib/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { DeleteConfirmDialog } from "../shared/dialog/DeleteConfirmDialog";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import IncidentSidebarCard from "./IncidentSidebarCard";

type IncidentSidebarProps = {
  incidents: IncidentDto[];
  location: LocationDto;
};

export default function IncidentInfoChipDetails({
  incidents,
  location,
}: IncidentSidebarProps) {
  const { data: session } = useSession();
  const role = session?.role;
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

  const deleteMutation = useDeleteIncidentInLocation({
    onSuccess: () => {
      refreshSidebar(location.id);
      setConfirmStateDelete(null);
    },
  });

  const handleDelete = () => {
    if (confirmStateDelete === null) return;
    deleteMutation.mutate(confirmStateDelete);
  };

  const handleEdit = (incident: IncidentDto) => {
    setModalState({ mode: "edit", incident });
  };

  const handleAdd = () => {
    setModalState({ mode: "create" });
  };
  const closeModal = () => setModalState(null);
  const queryClient = useQueryClient();

  const createMutation = useCreateIncident({
    onSuccess: () => {
      refreshSidebar(location.id);
      setModalState(null);
    },
  });

  const updateMutation = useUpdateIncidentInLocation({
    onSuccess: () => {
      refreshSidebar(location.id);
      setModalState(null);
    },
  });

  const refreshSidebar = (locationId: number) => {
    const pages = queryClient.getQueriesData<PaginatedResponse<LocationDto>>({
      queryKey: LOCATIONS_KEY,
    });

    const location = pages
      .flatMap(([, data]) => data?.items ?? [])
      .find((l) => l.id === locationId);

    if (!location) return;

    openSidebar(
      `incidents-${location.id}`,
      "Incidents at Location",
      "Warnings & Citations go here",
      <IncidentInfoChipDetails
        incidents={location.incidents}
        location={location}
      />,
      role === "admin" ? (
        <Button variant="default" size="sm" onClick={handleAdd}>
          Add New
        </Button>
      ) : undefined
    );
  };
  const handleCreateIncident = (data: IncidentCreateDto) => {
    createMutation.mutate(data);
  };

  const handleEditIncident = (data: IncidentCreateDto) => {
    if (modalState?.mode !== "edit") return;
    updateMutation.mutate({
      id: modalState.incident.id,
      payload: {
        location_place_id: location.google_place_id,
        incident_datetime: data.incident_datetime,
        description: data.description,
        severity: data.severity,
        reference_id: data.reference_id ?? null,
      },
    });
  };

  return (
    <div className="">
      <p className="text-sm text-gray-500 pb-4">
        View existing incidents, or add a new one.
      </p>
      <div>
        {incidents.map((incident) => (
          <IncidentSidebarCard
            incidents={incident}
            key={incident.id}
            onDeleteIncidentAction={requestDelete}
            onEditIncidentAction={handleEdit}
          />
        ))}
      </div>
      <DeleteConfirmDialog
        open={confirmStateDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmStateDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Incident"
        description="Are you sure you want to delete this incident? This action cannot be undone."
      />

      <IncidentDialog
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
        location={location}
      />
    </div>
  );
}
