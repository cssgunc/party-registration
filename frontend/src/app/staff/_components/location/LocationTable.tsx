"use client";

import { Badge } from "@/components/ui/badge";
import { LocationService } from "@/lib/api/location/location.service";
import {
  LocationCreate,
  LocationDto,
  getCitationCount,
  getWarningCount,
} from "@/lib/api/location/location.types";
import { PaginatedResponse } from "@/lib/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import { useState } from "react";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import IncidentSidebar from "./IncidentSidebar";
import LocationTableForm from "./LocationTableForm";

const locationService = new LocationService();

export const LocationTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingLocation, setEditingLocation] = useState<LocationDto | null>(
    null
  );

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
      console.error("Failed to create location:", error);
      const errorMessage = error.response?.data?.message || error.message;
      const userMessage =
        error.status === 409 ? "This location already exists." : errorMessage;

      openSidebar(
        "create-location",
        "New Location",
        "Add a new location to the system",
        <LocationTableForm
          title="New Location"
          onSubmit={handleFormSubmit}
          submissionError={userMessage}
        />
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingLocation(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LocationCreate }) =>
      locationService.updateLocation(id, payload),
    onError: (error: AxiosError<{ message: string }>) => {
      console.error("Failed to update location:", error);
      const errorMessage = error.response?.data?.message || error.message;
      const userMessage =
        error.status === 409 ? "This location already exists." : errorMessage;

      if (editingLocation) {
        openSidebar(
          `edit-location-${editingLocation.id}`,
          "Edit Location",
          "Update location information",
          <LocationTableForm
            title="Edit Location"
            onSubmit={handleFormSubmit}
            editData={{
              address: editingLocation.formatted_address || "",
              placeId: editingLocation.google_place_id || "",
              holdExpiration: editingLocation.hold_expiration || null,
            }}
            submissionError={userMessage}
          />
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingLocation(null);
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

    openSidebar(
      `edit-location-${location.id}`,
      "Edit Location",
      "Update location information",
      <LocationTableForm
        title="Edit Location"
        onSubmit={handleFormSubmit}
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
    setSidebarMode("create");
    openSidebar(
      "create-location",
      "New Location",
      "Add a new location to the system",
      <LocationTableForm title="New Location" onSubmit={handleFormSubmit} />
    );
  };

  const handleFormSubmit = async (data: {
    address: string;
    placeId: string;
    holdExpiration: Date | null;
  }) => {
    const payload: LocationCreate = {
      google_place_id: data.placeId,
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
      id: "incidents_info_chip",
      header: "Incidents",
      cell: ({ row }) => {
        console.log("Row data for incidents:", row.original);
        return (
          <div className="flex w-auto">
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() =>
                openSidebar(
                  `incidents-${row.original.id}`,
                  "Incidents at Location",
                  `Warnings & Citations go here`,
                  <IncidentSidebar incidents={row.original.incidents} />
                )
              }
            >
              <span className="mr-1">
                {getWarningCount(row.original) + getCitationCount(row.original)}{" "}
                {getWarningCount(row.original) +
                  getCitationCount(row.original) ===
                1
                  ? "incident"
                  : "incidents"}
              </span>
            </Badge>
          </div>
        );
      },
      enableColumnFilter: false,
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
