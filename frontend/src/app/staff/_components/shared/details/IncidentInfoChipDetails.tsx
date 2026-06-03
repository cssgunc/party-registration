import IncidentDialog from "@/components/IncidentDialog";
import { Button } from "@/components/ui/button";
import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import { IncidentCreateDto } from "@/lib/api/incident/incident.types";
import {
  useDeleteIncidentInLocation,
  useUpdateIncidentInLocation,
} from "@/lib/api/location/location.queries";
import {
  LocationDto,
  NestedIncidentDto,
} from "@/lib/api/location/location.types";
import { PlusIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import IncidentSidebarCard from "../../location/IncidentSidebarCard";
import { ConfirmDialog } from "../dialog/ConfirmDialog";
import { useSidebar } from "../sidebar/SidebarContext";

type IncidentSidebarProps = {
  incidents: NestedIncidentDto[];
  location: LocationDto;
};

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; incident: NestedIncidentDto }
  | null;

export default function IncidentInfoChipDetails({
  incidents,
  location,
}: IncidentSidebarProps) {
  const { data: session } = useSession();
  const role = session?.role;
  const { headerActionNode } = useSidebar();

  const [modalState, setModalState] = useState<ModalState>(null);
  const [confirmStateDelete, setConfirmStateDelete] = useState<number | null>(
    null
  );

  const requestDelete = useCallback((incidentId: number) => {
    setConfirmStateDelete(incidentId);
  }, []);

  const deleteMutation = useDeleteIncidentInLocation({
    onSuccess: () => {
      setConfirmStateDelete(null);
    },
  });

  const handleDelete = () => {
    if (confirmStateDelete === null) return;
    deleteMutation.mutate(confirmStateDelete);
  };

  const handleEdit = useCallback((incident: NestedIncidentDto) => {
    setModalState({ mode: "edit", incident });
  }, []);

  const handleAdd = () => {
    setModalState({ mode: "create" });
  };
  const closeModal = () => setModalState(null);

  const createMutation = useCreateIncident({
    onSuccess: () => {
      setModalState(null);
    },
  });

  const updateMutation = useUpdateIncidentInLocation({
    onSuccess: () => {
      setModalState(null);
    },
  });

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
      {role === "admin" &&
        headerActionNode &&
        createPortal(
          <Button variant="default" size="sm" onClick={handleAdd}>
            <PlusIcon className="size-4" />
          </Button>,
          headerActionNode
        )}
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
      <ConfirmDialog
        open={confirmStateDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmStateDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Incident"
        description="Are you sure you want to delete this incident? This action cannot be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting..."
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
