"use client";

import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useCreateLocation,
  useDeleteLocation,
  useDownloadLocationsCsv,
  useLocations,
  useUpdateLocation,
} from "@/lib/api/location/location.queries";
import { LocationCreate, LocationDto } from "@/lib/api/location/location.types";
import { getErrorMessage } from "@/lib/errors";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import IncidentInfoChipDetails from "../shared/details/IncidentInfoChipDetails";
import { FormSidebar } from "../shared/sidebar/FormSidebar";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { useFormSidebarState } from "../shared/sidebar/useFormSidebarState";
import { TableTemplate } from "../shared/table/TableTemplate";
import { deleteAction, editAction } from "../shared/table/rowActions";
import LocationTableForm from "./LocationTableForm";

const LOCATION_ERROR_OPTIONS = {
  status: { 409: "This location already exists" },
} as const;

export const LocationTable = () => {
  const { openSnackbar } = useSnackbar();
  const exportMutation = useDownloadLocationsCsv();
  const {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openCreate,
    openEdit,
    closeSidebar,
  } = useFormSidebarState<LocationDto>();

  const createMutation = useCreateLocation({
    onError: (error: Error) => {
      setSubmissionError(getErrorMessage(error, LOCATION_ERROR_OPTIONS));
    },
    onSuccess: () => {
      openSnackbar("Location created successfully", "success");
      closeSidebar();
    },
  });

  const updateMutation = useUpdateLocation({
    onError: (error: Error) => {
      setSubmissionError(getErrorMessage(error, LOCATION_ERROR_OPTIONS));
    },
    onSuccess: () => {
      openSnackbar("Location updated successfully", "success");
      closeSidebar();
    },
  });

  const deleteMutation = useDeleteLocation({
    onError: () => {
      openSnackbar("Failed to delete location.", "error");
    },
    onSuccess: () => {
      openSnackbar("Location deleted successfully", "success");
    },
  });

  const columns: ColumnDef<LocationDto>[] = [
    {
      accessorKey: "formatted_address",
      header: "Address",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "formatted_address" } },
    },
    {
      id: "incidents_info_chip",
      accessorFn: (row) => row.incidents.length,
      header: "Incidents",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "number",
          backendField: "incident_count",
          filterLabel: "Incident Count",
        },
      },
      cell: ({ row }) => {
        return (
          <div className="flex w-auto">
            <InfoChip
              chipKey={`incidents-${row.original.id}`}
              shortName={`${row.original.incidents.length}${" "}
                ${row.original.incidents.length === 1 ? "incident" : "incidents"}`}
              title="Incidents"
              description="View existing incidents, or add a new one"
              sidebarContent={
                <IncidentInfoChipDetails
                  key={`${row.original.id}-${JSON.stringify(
                    row.original.incidents.map((i) => i.id)
                  )}`}
                  incidents={row.original.incidents}
                  location={row.original}
                />
              }
            />
          </div>
        );
      },
    },
    {
      accessorKey: "hold_expiration",
      header: "Active Hold",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "date",
          backendField: "hold_expiration",
          nullable: true,
          operatorLabels: {
            null: "Inactive",
            notnull: "Active",
          },
        },
      },
      cell: ({ row }) => {
        const holdDate = row.getValue("hold_expiration") as Date | null;
        if (holdDate) {
          const formattedDate = format(new Date(holdDate), "MM-dd-yyyy");
          return `Expires: ${formattedDate}`;
        }
        return "No";
      },
    },
  ];
  return (
    <>
      <TableTemplate
        useQuery={useLocations}
        columns={columns}
        createAction={{ label: "New Location", fn: openCreate }}
        pageSizeStorageKey="staff-locations"
        rowActions={[
          editAction<LocationDto>({ onClick: openEdit }),
          deleteAction<LocationDto>({
            onClick: (location) => deleteMutation.mutate(location.id),
            resourceName: "Location",
            description: (location) =>
              `Are you sure you want to delete location ${location.formatted_address}? This action cannot be undone.`,
            isPending: deleteMutation.isPending,
          }),
        ]}
        exportMutation={exportMutation}
      />
      <FormSidebar
        mode={mode}
        row={row}
        modes={{
          create: {
            key: "create-location",
            title: "New Location",
            description: "Add a new location to the system",
            render: () => (
              <LocationTableForm
                onSubmit={(data) =>
                  createMutation.mutate({
                    google_place_id: data.placeId,
                    hold_expiration: data.holdExpiration,
                  })
                }
                submissionError={submissionError}
              />
            ),
          },
          edit: {
            key: (location) => `edit-location-${location.id}`,
            title: "Edit Location",
            description: "Update location information",
            render: (location) => (
              <LocationTableForm
                onSubmit={(data) => {
                  const payload: LocationCreate = {
                    google_place_id: data.placeId,
                    hold_expiration: data.holdExpiration,
                  };
                  updateMutation.mutate({ id: location.id, payload });
                }}
                editData={{
                  address: location.formatted_address || "",
                  placeId: location.google_place_id || "",
                  holdExpiration: location.hold_expiration || null,
                }}
                submissionError={submissionError}
              />
            ),
          },
        }}
        onClose={closeSidebar}
      />
    </>
  );
};
