"use client";

import { LocationService } from "@/lib/api/location/location.service";
import { LocationCreate, LocationDto } from "@/lib/api/location/location.types";
import { PaginatedResponse } from "@/lib/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import LocationTableForm from "./LocationTableForm";

const locationService = new LocationService();

export const LocationTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingLocation, setEditingLocation] = useState<LocationDto | null>(
    null
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (submissionError) {
      if (sidebarMode === "edit" && editingLocation) {
        openSidebar(
          `edit-location-${editingLocation.id}`,
          "Edit Location",
          "Update location information",
          <LocationTableForm
            onSubmit={handleFormSubmit}
            editData={{
              address: editingLocation.formatted_address || "",
              placeId: editingLocation.google_place_id || "",
              holdExpiration: editingLocation.hold_expiration || null,
              warning_count: editingLocation.warning_count ?? 0,
              citation_count: editingLocation.citation_count ?? 0,
            }}
            submissionError={submissionError}
          />
        );
      } else if (sidebarMode === "create") {
        openSidebar(
          "create-location",
          "New Location",
          "Add a new location to the system",
          <LocationTableForm
            onSubmit={handleFormSubmit}
            submissionError={submissionError}
          />
        );
      }
    }
  }, [submissionError]); // ← ADD sidebarMode and editingLocation here

  const locationsQuery = useQuery<PaginatedResponse<LocationDto>>({
    queryKey: ["locations"],
    queryFn: () => locationService.getLocations(),
    retry: 1,
  });

  const locations = (locationsQuery.data?.items ?? [])
    .slice()
    .sort((a, b) =>
      (a.formatted_address || "").localeCompare(b.formatted_address || "")
    );

  const createMutation = useMutation({
    mutationFn: (payload: LocationCreate) =>
      locationService.createLocation(payload),
    onError: (error: AxiosError<{ message: string }>) => {
      // Change to any to access response
      console.error("Failed to create location:", error);
      const errorMessage = error.response?.data?.message || error.message;
      if (error.response?.data?.message?.includes("Google Place ID")) {
        setSubmissionError("This location already exists.");
      } else {
        setSubmissionError(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingLocation(null);
      setSubmissionError(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LocationCreate }) =>
      locationService.updateLocation(id, payload),
    onError: (error: AxiosError<{ message: string }>) => {
      // Change to any to access response
      console.error("Failed to update location:", error);
      const errorMessage = error.response?.data?.message || error.message;
      setSubmissionError(errorMessage);
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
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["locations"] });

      const previous = queryClient.getQueryData<PaginatedResponse<LocationDto>>(
        ["locations"]
      );

      queryClient.setQueryData<PaginatedResponse<LocationDto> | undefined>(
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

  const handleEdit = (location: LocationDto) => {
    setEditingLocation(location);
    setSidebarMode("edit");
    setSubmissionError(null);

    openSidebar(
      `edit-location-${location.id}`,
      "Edit Location",
      "Update location information",
      <LocationTableForm
        title="Edit Location"
        onSubmit={handleFormSubmit}
        submissionError={null}
        editData={{
          address: location.formatted_address || "",
          placeId: location.google_place_id || "",
          holdExpiration: location.hold_expiration || null,
          warning_count: location.warning_count ?? 0,
          citation_count: location.citation_count ?? 0,
        }}
      />
    );
  };

  const handleDelete = (location: LocationDto) => {
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
      <LocationTableForm
        title="New Location"
        onSubmit={handleFormSubmit}
        submissionError={null} // Pass null initially
      />
    );
  };

  const handleFormSubmit = async (data: {
    address: string;
    placeId: string;
    holdExpiration: Date | null;
    warning_count: number;
    citation_count: number;
  }) => {
    const payload: LocationCreate = {
      google_place_id: data.placeId,
      warning_count: data.warning_count,
      citation_count: data.citation_count,
      hold_expiration: data.holdExpiration,
    };

    if (sidebarMode === "edit" && editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: ColumnDef<LocationDto>[] = [
    {
      accessorKey: "formatted_address",
      header: "Address",
    },
    {
      accessorKey: "warning_count",
      header: "Warning Count",
    },
    {
      accessorKey: "citation_count",
      header: "Citation Count",
    },
    {
      accessorKey: "hold_expiration",
      header: "Active Hold",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const holdDate = row.getValue("hold_expiration") as Date | null;
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
        getDeleteDescription={(location: LocationDto) =>
          `Are you sure you want to delete location ${location.formatted_address}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
