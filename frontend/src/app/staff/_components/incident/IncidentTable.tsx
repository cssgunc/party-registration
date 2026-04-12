"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import navyFlag from "@/components/icons/navyFlag.svg";
import redFlag from "@/components/icons/redFlag.svg";
import yellowFlag from "@/components/icons/yellowFlag.svg";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useCreateIncident,
  useDeleteIncident,
  useDownloadIncidentsCsv,
  useIncidents,
} from "@/lib/api/incident/incident.queries";
import {
  IncidentCreateDto,
  IncidentDto,
  IncidentSeverity,
} from "@/lib/api/incident/incident.types";
import {
  useLocations,
  useUpdateIncidentInLocation,
} from "@/lib/api/location/location.queries";
import { LocationDto } from "@/lib/api/location/location.types";
import {
  DEFAULT_TABLE_PARAMS,
  ServerColumnMap,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { formatTime } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { format } from "date-fns";
import Image from "next/image";
import { useMemo, useState } from "react";
import LocationInfoChipDetails from "../party/details/LocationInfoChipDetails";
import { GenericInfoChip } from "../shared/sidebar/GenericInfoChip";
import { TableTemplate } from "../shared/table/TableTemplate";
import IncidentDescriptionChipDetails from "./IncidentDescriptionChipDetails";
import IncidentTableForm from "./IncidentTableForm";

const hasIncidentChanged = (
  original: IncidentDto | null,
  updated: IncidentCreateDto,
  locationById: Map<number, LocationDto>
): boolean => {
  if (!original) return true;

  const originalLocation = locationById.get(original.location_id);
  const originalLocationPlaceId = originalLocation?.google_place_id ?? "";

  return (
    originalLocationPlaceId !== updated.location_place_id ||
    original.incident_datetime.getTime() !==
      updated.incident_datetime.getTime() ||
    original.description !== updated.description ||
    original.severity !== updated.severity ||
    original.reference_id !== updated.reference_id
  );
};

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

const SERVER_COLUMN_MAP: ServerColumnMap = {
  location: {
    backendField: "location.formatted_address",
    filterOperator: "contains",
  },
  incident_date: {
    backendField: "incident_datetime",
    filterOperator: "dateRange",
  },
  severity: {
    backendField: "severity",
    filterOperator: "eq",
  },
  reference_id: {
    backendField: "reference_id",
    filterOperator: "contains",
  },
  description: {
    backendField: "description",
    filterOperator: "contains",
  },
};

export const IncidentTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const { openSnackbar } = useSnackbar();
  const [editingIncident, setEditingIncident] = useState<IncidentDto | null>(
    null
  );
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const incidentsQuery = useIncidents(serverParams);
  const locationsQuery = useLocations();
  const { mutate: exportCsv, isPending: isExporting } =
    useDownloadIncidentsCsv();

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

  const createMutation = useCreateIncident({
    onError: (error: Error) => {
      const errorMessage = isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error.message || "Failed to create incident";
      reopenCreateSidebar(errorMessage);
    },
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
      closeSidebar();
      setEditingIncident(null);
    },
  });

  const updateMutation = useUpdateIncidentInLocation({
    onError: (
      error: Error,
      variables: { id: number; payload: Partial<IncidentCreateDto> }
    ) => {
      const errorMessage = isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error.message || "Failed to update incident";

      const targetIncident =
        editingIncident && editingIncident.id === variables.id
          ? editingIncident
          : incidents.find((incident) => incident.id === variables.id) || null;

      if (targetIncident) {
        reopenEditSidebar(targetIncident, errorMessage);
      }
    },
    onSuccess: (_data, variables) => {
      if (
        hasIncidentChanged(
          editingIncident,
          variables.payload as IncidentCreateDto,
          locationById
        )
      ) {
        openSnackbar("Incident updated successfully", "success");
      }
      closeSidebar();
      setEditingIncident(null);
    },
  });

  const deleteMutation = useDeleteIncident({
    onError: (error: Error) => {
      console.error("Failed to delete incident:", error);
    },
    onSuccess: () => {
      openSnackbar("Incident deleted successfully", "success");
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
    },
    {
      id: "incident_time",
      accessorFn: (row) => format(row.incident_datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: {
        filterType: "time",
        filterMode: "client",
      },
      cell: ({ row }) => {
        const date = new Date(row.original.incident_datetime);
        return formatTime(date);
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
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={incidents}
        columns={columns}
        resourceName="Incident"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={incidentsQuery.isLoading || locationsQuery.isLoading}
        isFetching={incidentsQuery.isFetching}
        error={
          (incidentsQuery.error as Error | null) ||
          (locationsQuery.error as Error | null)
        }
        getDeleteDescription={(incident: IncidentDto) =>
          `Are you sure you want to delete incident #${incident.id}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        serverMeta={
          incidentsQuery.data
            ? {
                totalRecords: incidentsQuery.data.total_records,
                totalPages: incidentsQuery.data.total_pages,
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
