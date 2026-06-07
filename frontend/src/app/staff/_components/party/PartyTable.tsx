"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useAdminParties,
  useCancelAdminParty,
  useCreateAdminParty,
  useRestoreAdminParty,
  useUpdateAdminParty,
} from "@/lib/api/party/admin-party.queries";
import { useDownloadPartiesCsv } from "@/lib/api/party/party.queries";
import {
  AdminCreatePartyDto,
  PartyDto,
  PartyStatus,
  getPartyValidationError,
} from "@/lib/api/party/party.types";
import { getErrorMessage } from "@/lib/errors";
import { formatTime } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Ban, Check, Undo2, X } from "lucide-react";
import ContactInfoChipDetails from "../shared/details/ContactInfoChipDetails";
import LocationInfoChipDetails from "../shared/details/LocationInfoChipDetails";
import StudentInfoChipDetails from "../shared/details/StudentInfoChipDetails";
import { FormSidebar } from "../shared/sidebar/FormSidebar";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { useFormSidebarState } from "../shared/sidebar/useFormSidebarState";
import { TableTemplate } from "../shared/table/TableTemplate";
import { type RowAction, editAction } from "../shared/table/rowActions";
import { useServerTableState } from "../shared/table/useServerTableState";
import PartyTableForm, { PartyTableFormValues } from "./PartyTableForm";

const PARTY_ERROR_OPTIONS = {
  status: {
    404: "Party not found",
  },
} as const;

const getPartyErrorMessage = (error: Error) =>
  getPartyValidationError(error)?.message ??
  getErrorMessage(error, PARTY_ERROR_OPTIONS);

export const PartyTable = () => {
  const { openSnackbar } = useSnackbar();
  const {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openCreate,
    openEdit,
    closeSidebar,
  } = useFormSidebarState<PartyDto>();

  const exportMutation = useDownloadPartiesCsv();

  const createMutation = useCreateAdminParty({
    onError: (error: Error) => {
      setSubmissionError(getPartyErrorMessage(error));
    },
    onSuccess: () => {
      openSnackbar("Party created successfully", "success");
      closeSidebar();
    },
  });

  const updateMutation = useUpdateAdminParty({
    onError: (error: Error) => {
      setSubmissionError(getPartyErrorMessage(error));
    },
    onSuccess: () => {
      openSnackbar("Party updated successfully", "success");
      closeSidebar();
    },
  });

  const cancelMutation = useCancelAdminParty({
    onError: (error: Error) => {
      openSnackbar(getPartyErrorMessage(error), "error");
    },
    onSuccess: () => {
      openSnackbar("Party cancelled successfully", "success");
    },
  });

  const restoreMutation = useRestoreAdminParty({
    onError: (error: Error) => {
      openSnackbar(getPartyErrorMessage(error), "error");
    },
    onSuccess: () => {
      openSnackbar("Party restored successfully", "success");
    },
  });

  const buildPayload = (data: PartyTableFormValues) => {
    // Construct party datetime
    const [hours, minutes] = data.partyTime.split(":").map(Number);
    const party_datetime = new Date(data.partyDate);
    party_datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    const payload: AdminCreatePartyDto = {
      type: "admin",
      google_place_id: data.placeId,
      party_datetime,
      contact_one_student_id: data.contactOneStudentId,
      contact_two: {
        email: data.contactTwoEmail,
        first_name: data.contactTwoFirstName,
        last_name: data.contactTwoLastName,
        phone_number: data.contactTwoPhoneNumber,
        contact_preference:
          (data.contactTwoPreference as "call" | "text") ?? "call",
      },
    };

    return payload;
  };

  const handleCreateSubmit = async (data: PartyTableFormValues) => {
    const payload = buildPayload(data);
    createMutation.mutate(payload);
  };

  const handleEditSubmit = async (
    partyId: number,
    data: PartyTableFormValues
  ) => {
    const payload = buildPayload(data);
    updateMutation.mutate({ id: partyId, payload });
  };

  const columns: ColumnDef<PartyDto>[] = [
    {
      id: "location",
      accessorFn: (row) => row.location.formatted_address,
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
            chipKey={`party-${row.original.id}-location`}
            title="Info about the Location"
            description="Detailed information about the selected location"
            shortName={location.formatted_address}
            sidebarContent={<LocationInfoChipDetails data={location} />}
          />
        );
      },
    },
    {
      id: "party_datetime",
      accessorFn: (row) => format(row.party_datetime, "MM-dd-yyyy"),
      header: "Date",
      enableColumnFilter: true,
      meta: { filter: { type: "datetime", backendField: "party_datetime" } },
      cell: ({ row }) => {
        return format(row.original.party_datetime, "M/d/yyyy");
      },
    },
    {
      id: "time",
      accessorFn: (row) => format(row.party_datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: { filter: { type: "time", backendField: "party_datetime_time" } },
      cell: ({ row }) => {
        const date = new Date(row.original.party_datetime);
        return formatTime(date);
      },
    },
    {
      id: "contact_one",
      accessorFn: (row) =>
        `${row.contact_one.first_name} ${row.contact_one.last_name}`,
      header: "Contact One",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "text",
          backendField: "contact_one.full_name",
        },
      },
      cell: ({ row }) => {
        const contact = row.original.contact_one;
        return contact ? (
          <InfoChip
            chipKey={`party-${row.original.id}-contact-one`}
            shortName={`${contact.first_name} ${contact.last_name}`}
            title="Info about the Student"
            description="Detailed information about the selected student"
            sidebarContent={<StudentInfoChipDetails data={contact} />}
          />
        ) : (
          "—"
        );
      },
    },
    {
      id: "contact_two",
      accessorFn: (row) =>
        `${row.contact_two.first_name} ${row.contact_two.last_name}`,
      header: "Contact Two",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "text",
          backendField: "contact_two.full_name",
        },
      },
      cell: ({ row }) => {
        const contact = row.original.contact_two;
        const partyId = row.original.id;
        if (!contact) return "—";
        return (
          <InfoChip
            chipKey={`party-${partyId}-contact-two`}
            shortName={`${contact.first_name} ${contact.last_name}`}
            title="Info about the Contact"
            description="Detailed information about the second contact"
            sidebarContent={<ContactInfoChipDetails data={contact} />}
          />
        );
      },
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: "Active",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "status",
          filterLabel: "Active",
          selectOptions: [PartyStatus.CONFIRMED, PartyStatus.CANCELLED],
        },
      },
      cell: ({ row }) =>
        row.original.status === PartyStatus.CANCELLED ? (
          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              <X className="size-4 text-destructive cursor-default" />
            </HoverCardTrigger>
            <HoverCardContent>
              This party was cancelled by the host
            </HoverCardContent>
          </HoverCard>
        ) : (
          <Check className="size-4" />
        ),
    },
  ];

  const serverTableState = useServerTableState({
    columns,
    pageSizeStorageKey: "staff-parties",
  });
  const query = useAdminParties(serverTableState.serverParams);

  return (
    <>
      <TableTemplate
        query={query}
        serverTableState={serverTableState}
        columns={columns}
        createAction={{ label: "New Party", fn: openCreate }}
        rowActions={[
          editAction<PartyDto>({ onClick: openEdit }),
          {
            label: "Cancel",
            icon: <Ban className="mr-2 size-4" />,
            variant: "destructive",
            isVisible: (party) => party.status !== PartyStatus.CANCELLED,
            onClick: (party) => cancelMutation.mutate(party.id),
            confirm: {
              title: "Cancel Party",
              description: (party) =>
                `Are you sure you want to cancel this party on ${format(
                  party.party_datetime,
                  "PPP 'at' p"
                )}?`,
              isPending: cancelMutation.isPending,
              dismissLabel: "Back",
              confirmLabel: "Cancel Party",
              pendingLabel: "Cancelling...",
            },
          } satisfies RowAction<PartyDto>,
          {
            label: "Restore",
            icon: <Undo2 className="mr-2 size-4" />,
            isVisible: (party) => party.status === PartyStatus.CANCELLED,
            onClick: (party) => restoreMutation.mutate(party.id),
          } satisfies RowAction<PartyDto>,
        ]}
        exportMutation={exportMutation}
      />
      <FormSidebar
        mode={mode}
        row={row}
        modes={{
          create: {
            key: "create-party",
            title: "New Party",
            description: "Add a new party to the system",
            render: () => (
              <PartyTableForm
                onSubmit={handleCreateSubmit}
                submissionError={submissionError}
              />
            ),
          },
          edit: {
            key: (party) => `edit-party-${party.id}`,
            title: "Edit Party",
            description: "Update party information",
            render: (party) => (
              <PartyTableForm
                onSubmit={(data) => handleEditSubmit(party.id, data)}
                editData={party}
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
