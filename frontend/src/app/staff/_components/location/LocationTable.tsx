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
import {
  DEFAULT_TABLE_PARAMS,
  ServerColumnMap,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useState } from "react";
import { GenericInfoChip } from "../shared/sidebar/GenericInfoChip";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import IncidentInfoChipDetails from "./IncidentInfoChipDetails";
import LocationTableForm from "./LocationTableForm";

const hasLocationChanged = (
  original: LocationDto | null,
  updated: LocationCreate
): boolean => {
  if (!original) return true;

  return (
    original.google_place_id !== updated.google_place_id ||
    original.hold_expiration !== updated.hold_expiration
  );
};

const SERVER_COLUMN_MAP: ServerColumnMap = {
  formatted_address: {
    backendField: "formatted_address",
    filterOperator: "contains",
  },
  hold_expiration: {
    backendField: "hold_expiration",
    filterOperator: "dateRange",
  },
};

export const LocationTable = () => {
  const { openSnackbar } = useSnackbar();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingLocation, setEditingLocation] = useState<LocationDto | null>(
    null
  );
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const locationsQuery = useLocations(serverParams);
  const locations = locationsQuery.data?.items ?? [];

  const { mutate: exportCsv, isPending: isExporting } =
    useDownloadLocationsCsv();

  const createMutation = useCreateLocation({
    onError: (error: Error) => {
      console.error("Failed to create location:", error);
      const errorMessage = isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error.message;
      const userMessage =
        isAxiosError(error) && error.status === 409
          ? "This location already exists."
          : errorMessage;

      openSidebar(
        "create-location",
        "New Location",
        "Add a new location to the system",
        <LocationTableForm
          onSubmit={handleCreateSubmit}
          submissionError={userMessage}
        />
      );
    },
    onSuccess: () => {
      openSnackbar("Location created successfully", "success");
      closeSidebar();
      setEditingLocation(null);
    },
  });

  const updateMutation = useUpdateLocation({
    onError: (
      error: Error,
      variables: { id: number; payload: LocationCreate }
    ) => {
      console.error("Failed to update location:", error);
      const errorMessage = isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error.message;
      const userMessage =
        isAxiosError(error) && error.status === 409
          ? "This location already exists."
          : errorMessage;

      const editTarget =
        editingLocation && editingLocation.id === variables.id
          ? editingLocation
          : null;

      if (!editTarget) {
        return;
      }

      openSidebar(
        `edit-location-${editTarget.id}`,
        "Edit Location",
        "Update location information",
        <LocationTableForm
          onSubmit={(data) => handleEditSubmit(editTarget.id, data)}
          editData={{
            address: editTarget.formatted_address || "",
            placeId: editTarget.google_place_id || "",
            holdExpiration: editTarget.hold_expiration || null,
          }}
          submissionError={userMessage}
        />
      );
    },
    onSuccess: (data, variables) => {
      if (hasLocationChanged(editingLocation, variables.payload)) {
        openSnackbar("Location updated successfully", "success");
      }
      closeSidebar();
      setEditingLocation(null);
    },
  });

  const deleteMutation = useDeleteLocation({
    onError: (error: Error) => {
      console.error("Failed to delete location:", error);
    },
    onSuccess: () => {
      openSnackbar("Location deleted successfully", "success");
    },
  });

  const handleEdit = (location: LocationDto) => {
    setEditingLocation(location);

    openSidebar(
      `edit-location-${location.id}`,
      "Edit Location",
      "Update location information",
      <LocationTableForm
        onSubmit={(data) => handleEditSubmit(location.id, data)}
        editData={{
          address: location.formatted_address || "",
          placeId: location.google_place_id || "",
          holdExpiration: location.hold_expiration || null,
        }}
      />
    );
  };

  const handleDelete = (location: LocationDto) => {
    deleteMutation.mutate(location.id);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    openSidebar(
      "create-location",
      "New Location",
      "Add a new location to the system",
      <LocationTableForm onSubmit={handleCreateSubmit} />
    );
  };

  const handleCreateSubmit = async (data: {
    address: string;
    placeId: string;
    holdExpiration: Date | null;
  }) => {
    const payload: LocationCreate = {
      google_place_id: data.placeId,
      hold_expiration: data.holdExpiration,
    };

    createMutation.mutate(payload);
  };

  const handleEditSubmit = async (
    locationId: number,
    data: {
      address: string;
      placeId: string;
      holdExpiration: Date | null;
    }
  ) => {
    const payload: LocationCreate = {
      google_place_id: data.placeId,
      hold_expiration: data.holdExpiration,
    };

    updateMutation.mutate({ id: locationId, payload });
  };

  const columns: ColumnDef<LocationDto>[] = [
    {
      accessorKey: "formatted_address",
      header: "Address",
    },
    {
      id: "incidents_info_chip",
      header: "Incidents",
      cell: ({ row }) => {
        return (
          <div className="flex w-auto">
            <GenericInfoChip
              chipKey={`incidents-${row.original.id}`}
              shortName={`${row.original.incidents.length}${" "}
                ${row.original.incidents.length === 1 ? "incident" : "incidents"}`}
              title="Incidents"
              description="Warnings & Citations go here"
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
      enableColumnFilter: false,
    },
    {
      accessorKey: "hold_expiration",
      header: "Active Hold",
      enableColumnFilter: true,
      meta: { filterType: "dateRange" },
      cell: ({ row }) => {
        const holdDate = row.getValue("hold_expiration") as Date | null;
        if (holdDate) {
          const formattedDate = new Date(holdDate).toLocaleDateString();
          return `Expires: ${formattedDate}`;
        }
        return "No";
      },
    },
  ];
  return (
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={locations}
        columns={columns}
        resourceName="Location"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={locationsQuery.isLoading}
        isFetching={locationsQuery.isFetching}
        error={locationsQuery.error as Error | null}
        getDeleteDescription={(location: LocationDto) =>
          `Are you sure you want to delete location ${location.formatted_address}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        serverMeta={
          locationsQuery.data
            ? {
                totalRecords: locationsQuery.data.total_records,
                totalPages: locationsQuery.data.total_pages,
              }
            : undefined
        }
        onStateChange={setServerParams}
        columnMap={SERVER_COLUMN_MAP}
        onExportCsv={exportCsv}
        isExporting={isExporting}
      />
    </div>
  );
};
