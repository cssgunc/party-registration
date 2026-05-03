"use client";

import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useAdminParties,
  useCreateAdminParty,
  useDeleteAdminParty,
  useUpdateAdminParty,
} from "@/lib/api/party/admin-party.queries";
import { useDownloadPartiesCsv } from "@/lib/api/party/party.queries";
import { AdminCreatePartyDto, PartyDto } from "@/lib/api/party/party.types";
import {
  DEFAULT_TABLE_PARAMS,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { formatTime } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { format } from "date-fns";
import { useState } from "react";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import PartyTableForm from "./PartyTableForm";
import ContactInfoChipDetails from "./details/ContactInfoChipDetails";
import LocationInfoChipDetails from "./details/LocationInfoChipDetails";
import StudentInfoChipDetails from "./details/StudentInfoChipDetails";

const hasPartyChanged = (
  original: PartyDto | null,
  updated: AdminCreatePartyDto
): boolean => {
  if (!original) return true;

  return (
    original.party_datetime.getTime() !== updated.party_datetime.getTime() ||
    original.location.google_place_id !== updated.google_place_id ||
    original.contact_two.email !== updated.contact_two.email ||
    original.contact_two.first_name !== updated.contact_two.first_name ||
    original.contact_two.last_name !== updated.contact_two.last_name ||
    original.contact_two.phone_number !== updated.contact_two.phone_number ||
    original.contact_two.contact_preference !==
      updated.contact_two.contact_preference
  );
};

const getErrorMessage = (error: Error): string => {
  if (isAxiosError(error)) {
    const detail = error.response?.data as {
      message?: string;
      detail?: string;
    };
    switch (error.response?.status) {
      case 404:
        return "Party not found.";
      case 403:
        return "You do not have permission to perform this action.";
      case 500:
        return "Server error. Please try again later.";
    }
    if (detail?.detail) return String(detail.detail);
    if (detail?.message) return String(detail.message);
    if (error.message) return error.message;
  }
  return "Operation failed";
};

export const PartyTable = () => {
  const { openSnackbar } = useSnackbar();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingParty, setEditingParty] = useState<PartyDto | null>(null);
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const partiesQuery = useAdminParties(serverParams);
  const parties = partiesQuery.data?.items ?? [];

  const { mutate: exportCsv, isPending: isExporting } = useDownloadPartiesCsv();

  const createMutation = useCreateAdminParty({
    onError: (error: Error) => {
      const message = getErrorMessage(error);

      openSidebar(
        "create-party",
        "New Party",
        "Add a new party to the system",
        <PartyTableForm
          onSubmit={handleCreateSubmit}
          submissionError={message}
        />
      );
    },
    onSuccess: () => {
      openSnackbar("Party created successfully", "success");
      closeSidebar();
      setEditingParty(null);
    },
  });

  const updateMutation = useUpdateAdminParty({
    onError: (
      error: Error,
      variables: { id: number; payload: AdminCreatePartyDto }
    ) => {
      const message = getErrorMessage(error);

      const editTarget =
        editingParty && editingParty.id === variables.id ? editingParty : null;

      if (!editTarget) {
        return;
      }

      openSidebar(
        `edit-party-${editTarget.id}`,
        "Edit Party",
        "Update party information",
        <PartyTableForm
          onSubmit={(data) => handleEditSubmit(editTarget.id, data)}
          editData={editTarget}
          submissionError={message}
        />
      );
    },
    onSuccess: (data, variables) => {
      if (hasPartyChanged(editingParty, variables.payload)) {
        openSnackbar("Party updated successfully", "success");
      }
      closeSidebar();
      setEditingParty(null);
    },
  });

  const deleteMutation = useDeleteAdminParty({
    onError: (error: Error) => {
      const message = getErrorMessage(error);
      console.error("Failed to delete party:", message);
    },
    onSuccess: () => {
      openSnackbar("Party deleted successfully", "success");
    },
  });

  const handleEdit = (party: PartyDto) => {
    setEditingParty(party);
    openSidebar(
      `edit-party-${party.id}`,
      "Edit Party",
      "Update party information",
      <PartyTableForm
        onSubmit={(data) => handleEditSubmit(party.id, data)}
        editData={party}
      />
    );
  };

  const handleDelete = (party: PartyDto) => {
    deleteMutation.mutate(party.id);
  };

  const handleCreate = () => {
    setEditingParty(null);
    openSidebar(
      "create-party",
      "New Party",
      "Add a new party to the system",
      <PartyTableForm onSubmit={handleCreateSubmit} />
    );
  };

  const buildPayload = (data: {
    address: string;
    placeId: string;
    partyDate: Date;
    partyTime: string;
    contactOneStudentId: number;
    contactTwoEmail: string;
    contactTwoFirstName: string;
    contactTwoLastName: string;
    contactTwoPhoneNumber: string;
    contactTwoPreference: "call" | "text" | string;
  }) => {
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

  const handleCreateSubmit = async (data: {
    address: string;
    placeId: string;
    partyDate: Date;
    partyTime: string;
    contactOneStudentId: number;
    contactTwoEmail: string;
    contactTwoFirstName: string;
    contactTwoLastName: string;
    contactTwoPhoneNumber: string;
    contactTwoPreference: "call" | "text" | string;
  }) => {
    const payload = buildPayload(data);
    createMutation.mutate(payload);
  };

  const handleEditSubmit = async (
    partyId: number,
    data: {
      address: string;
      placeId: string;
      partyDate: Date;
      partyTime: string;
      contactOneStudentId: number;
      contactTwoEmail: string;
      contactTwoFirstName: string;
      contactTwoLastName: string;
      contactTwoPhoneNumber: string;
      contactTwoPreference: "call" | "text" | string;
    }
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
        const date = new Date(row.original.party_datetime);
        return date.toLocaleDateString();
      },
    },
    {
      id: "time",
      accessorFn: (row) => format(row.party_datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: { filter: { type: "time" }, filterMode: "client" },
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
  ];

  return (
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={parties}
        columns={columns}
        resourceName="Party"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={partiesQuery.isLoading}
        isFetching={partiesQuery.isFetching}
        error={partiesQuery.error as Error | null}
        getDeleteDescription={(party: PartyDto) =>
          `Are you sure you want to delete this party on ${new Date(
            party.party_datetime
          ).toLocaleString()}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        serverMeta={
          partiesQuery.data
            ? {
                totalRecords: partiesQuery.data.total_records,
                totalPages: partiesQuery.data.total_pages,
                sortBy: partiesQuery.data.sort_by,
                sortOrder: partiesQuery.data.sort_order,
              }
            : undefined
        }
        onStateChange={setServerParams}
        onExportCsv={exportCsv}
        isExporting={isExporting}
      />
    </div>
  );
};
