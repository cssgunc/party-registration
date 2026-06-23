"use client";

import IncidentFlag from "@/components/icons/IncidentFlag";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useCreateIncident,
  useDeleteIncident,
  useDownloadIncidentsCsv,
  useIncidents,
} from "@/lib/api/incident/incident.queries";
import {
  INCIDENT_SEVERITY_LABELS,
  IncidentDto,
  PaginatedIncidentsResponse,
} from "@/lib/api/incident/incident.types";
import { useUpdateIncidentInLocation } from "@/lib/api/location/location.queries";
import { getErrorMessage } from "@/lib/errors";
import { formatAddress, formatTime } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import DescriptionInfoChipDetails from "../shared/details/DescriptionInfoChipDetails";
import LocationInfoChipDetails from "../shared/details/LocationInfoChipDetails";
import { FormSidebar } from "../shared/sidebar/FormSidebar";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { useFormSidebarState } from "../shared/sidebar/useFormSidebarState";
import { TableTemplate } from "../shared/table/TableTemplate";
import { deleteAction, editAction } from "../shared/table/rowActions";
import { useServerTableState } from "../shared/table/useServerTableState";
import { IncidentSeverityCountsHeader } from "./IncidentSeverityCountsHeader";
import IncidentTableForm from "./IncidentTableForm";

function truncateDescription(
  description: string | undefined,
  limit: number = 50
): string {
  if (!description) return "-";
  if (description.length <= limit) return description;
  return description.substring(0, limit) + "...";
}

/**
 * Staff dashboard Incidents tab — server-paginated table of police incidents.
 *
 * Displays location, date, time, severity, reference ID, and a truncated
 * description chip. The table header shows aggregate severity counts via
 * `IncidentSeverityCountsHeader`. Admins can create, edit, and delete incidents.
 * Supports CSV export.
 */
export const IncidentTable = () => {
  const { openSnackbar, snackbarPromise } = useSnackbar();
  const {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openCreate,
    openEdit,
    closeSidebar,
  } = useFormSidebarState<IncidentDto>();
  const exportMutation = useDownloadIncidentsCsv();

  const createMutation = useCreateIncident({
    onError: (error: Error) => {
      setSubmissionError(
        getErrorMessage(error, {
          fallback: "Failed to save the incident. Please try again.",
        })
      );
    },
    onSuccess: () => {
      openSnackbar("Incident created successfully", "success");
      closeSidebar();
    },
  });

  const updateMutation = useUpdateIncidentInLocation({
    onError: (error: Error) => {
      setSubmissionError(
        getErrorMessage(error, {
          fallback: "Failed to save the incident. Please try again.",
        })
      );
    },
    onSuccess: () => {
      openSnackbar("Incident updated successfully", "success");
      closeSidebar();
    },
  });

  const deleteMutation = useDeleteIncident();

  const columns: ColumnDef<IncidentDto>[] = [
    {
      id: "location",
      accessorFn: (row) => row.location?.formatted_address ?? "",
      header: "Address",
      enableColumnFilter: true,
      meta: {
        filter: { type: "text", backendField: "location.formatted_address" },
      },
      cell: ({ row }) => {
        const location = row.original.location;
        if (!location) return "—";
        return (
          <InfoChip
            chipKey={`incident-${row.original.id}-location`}
            title="Info about the Location"
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
      meta: { filter: { type: "datetime", backendField: "incident_datetime" } },
      cell: ({ row }) => {
        const date = row.original.incident_datetime;
        return format(date, "M/d/yyyy");
      },
    },
    {
      id: "incident_time",
      accessorFn: (row) => format(row.incident_datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: {
        filter: { type: "time", backendField: "incident_datetime_time" },
      },
      cell: ({ row }) => {
        const date = new Date(row.original.incident_datetime);
        return formatTime(date);
      },
    },
    {
      accessorKey: "severity",
      header: "Severity",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "severity",
          selectOptions: ["remote_warning", "in_person_warning", "citation"],
        },
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IncidentFlag type={row.original.severity} />
          {INCIDENT_SEVERITY_LABELS[row.original.severity]}
        </div>
      ),
    },
    {
      accessorKey: "reference_id",
      header: "Reference ID",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "text",
          backendField: "reference_id",
          nullable: true,
        },
      },
      cell: ({ row }) => row.original.reference_id || "-",
    },
    {
      accessorKey: "description",
      header: "Description",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "text",
          backendField: "description",
          nullable: true,
        },
      },
      cell: ({ row }) => {
        const description = row.original.description;
        if (!description) {
          return "—";
        }
        return (
          <InfoChip
            chipKey={`incident-${row.original.id}-description`}
            title="Incident Description"
            description="View the full incident description"
            shortName={truncateDescription(description)}
            sidebarContent={<DescriptionInfoChipDetails data={row.original} />}
          />
        );
      },
    },
  ];

  const serverTableState = useServerTableState({
    columns,
    pageSizeStorageKey: "staff-incidents",
  });
  const query = useIncidents(serverTableState.serverParams);

  return (
    <>
      <TableTemplate
        query={query}
        serverTableState={serverTableState}
        columns={columns}
        createAction={{ label: "New Incident", fn: openCreate }}
        rowActions={[
          editAction<IncidentDto>({ onClick: openEdit }),
          deleteAction<IncidentDto>({
            onClick: (incident) =>
              snackbarPromise(deleteMutation.mutateAsync(incident.id), {
                loading: "Deleting incident...",
                success: "Incident deleted successfully",
                error: "Failed to delete incident",
              }),
            resourceName: "Incident",
            description: (incident) =>
              `Are you sure you want to delete this incident at ${formatAddress(incident.location, ["street_number", "street_name", "unit"])}? This action cannot be undone.`,
            isPending: deleteMutation.isPending,
          }),
        ]}
        exportMutation={exportMutation}
        headerSlot={
          <IncidentSeverityCountsHeader
            counts={
              (query.data as PaginatedIncidentsResponse | undefined)
                ?.severity_counts
            }
            isLoading={query.isLoading || query.isFetching}
          />
        }
      />
      <FormSidebar
        mode={mode}
        row={row}
        modes={{
          create: {
            key: "create-incident",
            title: "New Incident",
            description: "Add a new incident to the system",
            render: () => (
              <IncidentTableForm
                onSubmit={(data) => createMutation.mutate(data)}
                submissionError={submissionError}
                isPending={createMutation.isPending}
              />
            ),
          },
          edit: {
            key: (incident) => `edit-incident-${incident.id}`,
            title: "Edit Incident",
            description: "Update incident information",
            render: (incident) => (
              <IncidentTableForm
                editData={incident}
                onSubmit={(data) =>
                  updateMutation.mutate({ id: incident.id, payload: data })
                }
                submissionError={submissionError}
                isPending={updateMutation.isPending}
              />
            ),
          },
        }}
        onClose={closeSidebar}
      />
    </>
  );
};
