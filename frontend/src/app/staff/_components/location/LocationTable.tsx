"use client";

import {
  LocationCreatePayload,
  LocationService,
  PaginatedLocationResponse,
} from "@/lib/api/location/location.service";
import { Location } from "@/lib/api/location/location.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import LocationTableCreateEditForm from "./LocationTableCreateEdit";
import { TableTemplate } from "../shared/table/TableTemplate";

const locationService = new LocationService();

export const LocationTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const locationsQuery = useQuery<PaginatedLocationResponse>({
    queryKey: ["locations"],
    queryFn: () => locationService.getLocations(),
    retry: 1,
  });

  const locations = (locationsQuery.data?.items ?? [])
    .slice()
    .sort((a, b) =>
      (a.formattedAddress || "").localeCompare(b.formattedAddress || "")
    );

  const createMutation = useMutation({
    mutationFn: (payload: LocationCreatePayload) =>
      locationService.createLocation(payload),
    onError: (error: Error) => {
      console.error("Failed to create location:", error);
      setSubmissionError(`Failed to create location: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingLocation(null);
      setSubmissionError(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: LocationCreatePayload;
    }) => locationService.updateLocation(id, payload),
    onError: (error: Error) => {
      console.error("Failed to update location:", error);
      setSubmissionError(`Failed to update location: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingLocation(null);
      setSubmissionError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => locationService.deleteLocation(id),
    // Optimistically remove the location from the cache.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["locations"] });

      const previous = queryClient.getQueryData<PaginatedLocationResponse>([
        "locations",
      ]);

      queryClient.setQueryData<PaginatedLocationResponse | undefined>(
        ["locations"],
        (old) =>
          old
            ? {
                ...old,
                items: old.items.filter((l) => l.id !== id),
              }
            : old
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      console.error("Failed to delete location:", error);
      if (context?.previous) {
        queryClient.setQueryData(["locations"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setSidebarMode("edit");
    setSubmissionError(null);
    openSidebar(
      `edit-location-${location.id}`,
      "Edit Location",
      "Update location information",
      <LocationTableCreateEditForm
        title="Edit Location"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
        editData={{
          address: location.formattedAddress || "",
          placeId: location.googlePlaceId || "",
          holdExpiration: location.holdExpirationDate || null,
          warningCount: location.warningCount ?? 0,
          citationCount: location.citationCount ?? 0,
        }}
      />
    );
  };

  const handleDelete = (location: Location) => {
    deleteMutation.mutate(location.id);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setSidebarMode("create");
    setSubmissionError(null);
    openSidebar(
      "create-location",
      "New Location",
      "Add a new location to the system",
      <LocationTableCreateEditForm
        title="New Location"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
      />
    );
  };

  const handleFormSubmit = async (data: {
    address: string;
    placeId: string;
    holdExpiration: Date | null;
    warningCount: number;
    citationCount: number;
  }) => {
    let hold_expiration_str: string | null = null;
    if (data.holdExpiration) {
      // Format as local datetime without timezone (YYYY-MM-DDTHH:mm:ss)
      const date = data.holdExpiration;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      const second = String(date.getSeconds()).padStart(2, "0");
      hold_expiration_str = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    const payload: LocationCreatePayload = {
      google_place_id: data.placeId,
      warning_count: data.warningCount,
      citation_count: data.citationCount,
      hold_expiration: hold_expiration_str,
    };

    if (sidebarMode === "edit" && editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };
  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: "formattedAddress",
      header: "Address",
    },
    {
      accessorKey: "warningCount",
      header: "Warning Count",
    },
    {
      accessorKey: "citationCount",
      header: "Citation Count",
    },
    {
      accessorKey: "holdExpirationDate",
      header: "Active Hold",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const holdDate = row.getValue("holdExpirationDate") as Date | null;
        if (holdDate) {
          const formattedDate = new Date(holdDate).toLocaleDateString();
          return `until ${formattedDate}`;
        }
        return "no active hold";
      },

      filterFn: (row, columnId, filterValue) => {
        const holdDate = row.getValue(columnId) as Date | null;
        const displayText = holdDate
          ? `until ${new Date(holdDate).toLocaleDateString()}`
          : "no active hold";
        return displayText
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());
      },
    },
  ];

  return (
    <div className="space-y-4">
      <TableTemplate
        data={locations}
        columns={columns}
        resourceName="Location"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreate}
        isLoading={locationsQuery.isLoading}
        error={locationsQuery.error as Error | null}
        getDeleteDescription={(location: Location) =>
          `Are you sure you want to delete location ${location.formattedAddress}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
