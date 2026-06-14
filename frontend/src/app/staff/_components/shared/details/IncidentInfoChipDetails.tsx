import IncidentDialog from "@/components/IncidentDialog";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { IncidentCreateDto } from "@/lib/api/incident/incident.types";
import {
  useCreateIncidentInLocation,
  useDeleteIncidentInLocation,
  useUpdateIncidentInLocation,
} from "@/lib/api/location/location.queries";
import {
  LocationDto,
  NestedIncidentDto,
} from "@/lib/api/location/location.types";
import { PlusIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import IncidentSidebarCard from "../../location/IncidentSidebarCard";
import { ConfirmDialog } from "../dialog/ConfirmDialog";
import { useSidebar } from "../sidebar/SidebarContext";

type Props = {
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
}: Props) {
  const { data: session } = useSession();
  const role = session?.role;
  const { headerActionNode } = useSidebar();
  const { snackbarPromise } = useSnackbar();

  const [modalState, setModalState] = useState<ModalState>(null);
  const [confirmStateDelete, setConfirmStateDelete] = useState<number | null>(
    null
  );
  const [openIncidentIds, setOpenIncidentIds] = useState<Set<number>>(
    new Set()
  );

  const setIncidentOpen = (id: number, open: boolean) => {
    setOpenIncidentIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const deleteMutation = useDeleteIncidentInLocation();

  const handleDelete = () => {
    if (confirmStateDelete === null) return;
    setConfirmStateDelete(null);
    snackbarPromise(deleteMutation.mutateAsync(confirmStateDelete), {
      loading: "Deleting incident...",
      success: "Incident deleted successfully",
      error: "Failed to delete incident",
    });
  };

  const createMutation = useCreateIncidentInLocation();

  const handleCreateIncident = (data: IncidentCreateDto) => {
    setModalState(null);
    snackbarPromise(createMutation.mutateAsync(data), {
      loading: "Creating incident...",
      success: "Incident created successfully",
      error: "Failed to create incident",
    });
  };

  const updateMutation = useUpdateIncidentInLocation();

  const handleEditIncident = (data: IncidentCreateDto) => {
    if (modalState?.mode !== "edit") return;
    const incidentId = modalState.incident.id;
    setModalState(null);
    setIncidentOpen(incidentId, true);
    snackbarPromise(
      updateMutation.mutateAsync({
        id: incidentId,
        payload: {
          location_place_id: location.google_place_id,
          incident_datetime: data.incident_datetime,
          description: data.description,
          severity: data.severity,
          reference_id: data.reference_id ?? null,
        },
      }),
      {
        loading: "Updating incident...",
        success: "Incident updated successfully",
        error: "Failed to update incident",
      }
    );
  };

  return (
    <div className="">
      {role === "admin" &&
        headerActionNode &&
        createPortal(
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setModalState({ mode: "create" });
            }}
            aria-label="Add new incident"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </Button>,
          headerActionNode
        )}
      <div>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No incidents
          </p>
        ) : (
          incidents.map((incident) => (
            <IncidentSidebarCard
              incident={incident}
              key={incident.id}
              open={openIncidentIds.has(incident.id)}
              onOpenChange={(open) => setIncidentOpen(incident.id, open)}
              onDeleteIncidentAction={setConfirmStateDelete}
              onEditIncidentAction={(incident: NestedIncidentDto) => {
                setModalState({ mode: "edit", incident });
              }}
            />
          ))
        )}
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
          if (!open) setModalState(null);
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
