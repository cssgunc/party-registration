"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import navyFlag from "@/components/icons/navyFlag.svg";
import redFlag from "@/components/icons/redFlag.svg";
import yellowFlag from "@/components/icons/yellowFlag.svg";
import { IncidentService } from "@/lib/api/incident/incident.service";
import {
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import { LocationService } from "@/lib/api/location/location.service";
import { LocationDto } from "@/lib/api/location/location.types";
import { PaginatedResponse } from "@/lib/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import { format, isWithinInterval, startOfDay } from "date-fns";
import Image from "next/image";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import LocationInfoChipDetails from "../party/details/LocationInfoChipDetails";
import { GenericInfoChip } from "../shared/sidebar/GenericInfoChip";
import { TableTemplate } from "../shared/table/TableTemplate";
import IncidentDescriptionChipDetails from "./IncidentDescriptionChipDetails";
import IncidentTableForm from "./IncidentTableForm";

const incidentService = new IncidentService();
const locationService = new LocationService();

function severityLabel(severity: IncidentSeverity): string {
  if (severity === "remote_warning") return "Remote Warning";
  if (severity === "in_person_warning") return "In-Person Warning";
  return "Citation";
}

function getSeverityFlag(severity: IncidentSeverity) {
  if (severity === "remote_warning") return navyFlag;
  if (severity === "in_person_warning") return yellowFlag;
  return redFlag;
}

function truncateDescription(
  description: string | undefined,
  limit: number = 50
): string {
  if (!description) return "-";
  if (description.length <= limit) return description;
  return description.substring(0, limit) + "...";
}

export const IncidentTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingIncident, setEditingIncident] = useState<IncidentDto | null>(
    null
  );

  const incidentsQuery = useQuery<PaginatedResponse<IncidentDto>>({
    queryKey: ["incidents"],
    queryFn: () => incidentService.listIncidents(),
    retry: 1,
  });

  const locationsQuery = useQuery<PaginatedResponse<LocationDto>>({
    queryKey: ["locations"],
    queryFn: () => locationService.getLocations(),
    retry: 1,
  });

  const incidents = useMemo(
    () => incidentsQuery.data?.items ?? [],
    [incidentsQuery.data]
  );
  const locations = useMemo(
    () => locationsQuery.data?.items ?? [],
    [locationsQuery.data]
  );

  const locationLabelById = useMemo(
    () =>
      new Map(
        locations.map((location) => [location.id, location.formatted_address])
      ),
    [locations]
  );

  const locationById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  );

  const reopenCreateSidebar = (submissionError?: string | null) => {
    openSidebar(
      "create-incident",
      "New Incident",
      "Add a new incident to the system",
      <IncidentTableForm
        title="New Incident"
        allLocations={locations}
        onSubmit={handleCreateSubmit}
        submissionError={submissionError}
      />
    );
  };

  const reopenEditSidebar = (
    incident: IncidentDto,
    submissionError?: string | null
  ) => {
    openSidebar(
      `edit-incident-${incident.id}`,
      "Edit Incident",
      "Update incident information",
      <IncidentTableForm
        title="Edit Incident"
        allLocations={locations}
        editData={incident}
        onSubmit={(data) => handleEditSubmit(incident.id, data)}
        submissionError={submissionError}
      />
    );
  };

  const createMutation = useMutation({
    mutationFn: (payload: IncidentCreateDto) =>
      incidentService.createIncident(payload),
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create incident";
      reopenCreateSidebar(errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingIncident(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<IncidentCreateDto>;
    }) => incidentService.updateIncident(id, payload),
    onError: (
      error: AxiosError<{ message?: string }>,
      variables: { id: number; payload: Partial<IncidentCreateDto> }
    ) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update incident";

      const targetIncident =
        editingIncident && editingIncident.id === variables.id
          ? editingIncident
          : incidents.find((incident) => incident.id === variables.id) || null;

      if (targetIncident) {
        reopenEditSidebar(targetIncident, errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      closeSidebar();
      setEditingIncident(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => incidentService.deleteIncident(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["incidents"] });

      const previous = queryClient.getQueryData<PaginatedResponse<IncidentDto>>(
        ["incidents"]
      );

      queryClient.setQueryData<PaginatedResponse<IncidentDto> | undefined>(
        ["incidents"],
        (old) =>
          old
            ? {
                ...old,
                items: old.items.filter((incident) => incident.id !== id),
              }
            : old
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      console.error("Failed to delete incident:", error);
      if (context?.previous) {
        queryClient.setQueryData(["incidents"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const handleCreate = () => {
    setEditingIncident(null);
    reopenCreateSidebar();
  };

  const handleCreateSubmit = async (data: IncidentCreateDto) => {
    createMutation.mutate(data);
  };

  const handleEdit = (incident: IncidentDto) => {
    setEditingIncident(incident);
    reopenEditSidebar(incident);
  };

  const handleEditSubmit = async (
    incidentId: number,
    data: IncidentCreateDto
  ) => {
    updateMutation.mutate({ id: incidentId, payload: data });
  };

  const handleDelete = (incident: IncidentDto) => {
    deleteMutation.mutate(incident.id);
  };

  const columns: ColumnDef<IncidentDto>[] = [
    {
      id: "location",
      accessorFn: (row) =>
        locationLabelById.get(row.location_id) ||
        `Location #${row.location_id}`,
      header: "Address",
      enableColumnFilter: true,
      meta: {
        filterType: "text",
      },
      cell: ({ row }) => {
        const location = locationById.get(row.original.location_id);
        if (!location) {
          return "—";
        }
        return (
          <GenericInfoChip
            chipKey={`incident-${row.original.id}-location`}
            title="Location Information"
            description="Detailed information about the selected location"
            shortName={location.formatted_address}
            sidebarContent={<LocationInfoChipDetails data={location} />}
          />
        );
      },
    },
    {
      id: "incident_date",
      accessorFn: (row) => format(row.incident_datetime, "MM-dd-yyyy"),
      header: "Date",
      enableColumnFilter: true,
      meta: {
        filterType: "dateRange",
      },
      cell: ({ row }) => {
        const date = row.original.incident_datetime;
        return date.toLocaleDateString();
      },
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;

        const dateRange = filterValue as DateRange;
        const date = startOfDay(new Date(row.original.incident_datetime));

        if (dateRange.from && !dateRange.to) {
          return date.getTime() === startOfDay(dateRange.from).getTime();
        }

        if (dateRange.from && dateRange.to) {
          return isWithinInterval(date, {
            start: startOfDay(dateRange.from),
            end: startOfDay(dateRange.to),
          });
        }

        return true;
      },
    },
    {
      id: "incident_time",
      accessorFn: (row) => format(row.incident_datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: {
        filterType: "time",
      },
      cell: ({ row }) => {
        const date = new Date(row.original.incident_datetime);
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      },
      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;

        const date = new Date(row.original.incident_datetime);
        const [filterHours, filterMinutes] = String(filterValue)
          .split(":")
          .map(Number);

        return (
          date.getHours() === filterHours && date.getMinutes() === filterMinutes
        );
      },
    },
    {
      accessorKey: "severity",
      header: "Severity",
      enableColumnFilter: true,
      meta: {
        filterType: "select",
        selectOptions: ["remote_warning", "in_person_warning", "citation"],
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Image
            src={getSeverityFlag(row.original.severity)}
            alt={row.original.severity}
            width={16}
            height={16}
          />
          {severityLabel(row.original.severity)}
        </div>
      ),
    },
    {
      accessorKey: "reference_id",
      header: "Reference ID",
      enableColumnFilter: true,
      cell: ({ row }) => row.original.reference_id || "-",
    },
    {
      accessorKey: "description",
      header: "Description",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const description = row.original.description;
        if (!description) {
          return "—";
        }
        return (
          <GenericInfoChip
            chipKey={`incident-${row.original.id}-description`}
            title="Description"
            description="View the full incident description"
            shortName={truncateDescription(description)}
            sidebarContent={
              <IncidentDescriptionChipDetails data={row.original} />
            }
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <TableTemplate
        data={incidents}
        columns={columns}
        resourceName="Incident"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={incidentsQuery.isLoading || locationsQuery.isLoading}
        error={
          (incidentsQuery.error as Error | null) ||
          (locationsQuery.error as Error | null)
        }
        getDeleteDescription={(incident: IncidentDto) =>
          `Are you sure you want to delete incident #${incident.id}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        sortBy={(a, b) =>
          b.incident_datetime.getTime() - a.incident_datetime.getTime()
        }
      />
    </div>
  );
};
