"use client";

import { PartyService } from "@/lib/api/party/party.service";
import { AdminCreatePartyDto, PartyDto } from "@/lib/api/party/party.types";
import { PaginatedResponse } from "@/lib/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import { format, isWithinInterval, startOfDay } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { GenericInfoChip } from "../shared/sidebar/GenericInfoChip";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import PartyTableForm from "./PartyTableForm";
import ContactInfoChipDetails from "./details/ContactInfoChipDetails";
import LocationInfoChipDetails from "./details/LocationInfoChipDetails";
import StudentInfoChipDetails from "./details/StudentInfoChipDetails";

const partyService = new PartyService();

export const PartyTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingParty, setEditingParty] = useState<PartyDto | null>(null);

  const partiesQuery = useQuery({
    queryKey: ["parties"],
    queryFn: () => partyService.listParties(),
    retry: 1,
  });

  const parties = partiesQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: AdminCreatePartyDto) =>
      partyService.createParty(payload),
    onError: (error: AxiosError<{ message: string }>) => {
      console.error("Failed to create party:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create party";

      openSidebar(
        "create-party",
        "New Party",
        "Add a new party to the system",
        <PartyTableForm
          title="New Party"
          onSubmit={handleFormSubmit}
          submissionError={errorMessage}
        />
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      closeSidebar();
      setEditingParty(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: AdminCreatePartyDto;
    }) => partyService.updateParty(id, payload),
    onError: (error: Error) => {
      console.error("Failed to update party:", error);
      const isNotFound =
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 404;
      const errorMessage = isNotFound
        ? "Student not found. Please verify the first contact email belongs to a registered student."
        : `Failed to update party: ${error.message}`;

      if (editingParty) {
        openSidebar(
          `edit-party-${editingParty.id}`,
          "Edit Party",
          "Update party information",
          <PartyTableForm
            title="Edit Party"
            onSubmit={handleFormSubmit}
            editData={editingParty}
            submissionError={errorMessage}
          />
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      closeSidebar();
      setEditingParty(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => partyService.deleteParty(id),
    // Optimistically remove the party from the cache.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["parties"] });

      const previous = queryClient.getQueryData<PaginatedResponse<PartyDto>>([
        "parties",
      ]);

      queryClient.setQueryData<PaginatedResponse<PartyDto>>(
        ["parties"],
        (prev) =>
          prev && {
            ...prev,
            items: prev.items.filter((p) => p.id !== id),
          }
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      console.error("Failed to delete party:", error);
      if (context?.previous) {
        queryClient.setQueryData(["parties"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });

  const handleEdit = (party: PartyDto) => {
    setEditingParty(party);
    setSidebarMode("edit");
    openSidebar(
      `edit-party-${party.id}`,
      "Edit Party",
      "Update party information",
      <PartyTableForm
        title="Edit Party"
        onSubmit={handleFormSubmit}
        editData={party}
      />
    );
  };

  const handleDelete = (party: PartyDto) => {
    deleteMutation.mutate(party.id);
  };

  const handleCreate = () => {
    setEditingParty(null);
    setSidebarMode("create");
    openSidebar(
      "create-party",
      "New Party",
      "Add a new party to the system",
      <PartyTableForm title="New Party" onSubmit={handleFormSubmit} />
    );
  };

  const handleFormSubmit = async (data: {
    address: string;
    placeId: string;
    partyDate: Date;
    partyTime: string;
    contactOneEmail: string;
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
      contact_one_email: data.contactOneEmail,
      contact_two: {
        email: data.contactTwoEmail,
        first_name: data.contactTwoFirstName,
        last_name: data.contactTwoLastName,
        phone_number: data.contactTwoPhoneNumber,
        contact_preference:
          (data.contactTwoPreference as "call" | "text") ?? "call",
      },
    };

    if (sidebarMode === "edit" && editingParty) {
      updateMutation.mutate({ id: editingParty.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };
  const columns: ColumnDef<PartyDto>[] = [
    {
      id: "location",
      accessorFn: (row) => row.location.formatted_address,
      header: "Address",
      enableColumnFilter: true,
      meta: {
        filterType: "text",
      },
      cell: ({ row }) => {
        const location = row.original.location;
        if (!location) {
          return "—";
        }
        return (
          <GenericInfoChip
            chipKey={`party-${row.original.id}-location`}
            title="Location Information"
            description="Detailed information about the selected location"
            shortName={location.formatted_address}
            sidebarContent={<LocationInfoChipDetails data={location} />}
          />
        );
      },

      filterFn: (row, _columnId, filterValue) => {
        const location = row.original.location;
        const addressString = `${location.street_number || ""} ${
          location.street_name || ""
        }`
          .toLowerCase()
          .trim();
        return addressString.includes(String(filterValue).toLowerCase());
      },
    },
    {
      id: "party_datetime",
      accessorFn: (row) => format(row.party_datetime, "MM-dd-yyyy"),
      header: "Date",
      enableColumnFilter: true,
      meta: {
        filterType: "dateRange",
      },
      cell: ({ row }) => {
        const party_datetime = row.original.party_datetime;
        const date = new Date(party_datetime);
        return date.toLocaleDateString();
      },

      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;

        const dateRange = filterValue as DateRange;
        const party_datetime = row.original.party_datetime;
        const date = startOfDay(new Date(party_datetime));

        // If only 'from' date is selected
        if (dateRange.from && !dateRange.to) {
          return date.getTime() === startOfDay(dateRange.from).getTime();
        }

        // If both dates are selected
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
      id: "time",
      accessorFn: (row) => format(row.party_datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: {
        filterType: "time",
      },
      cell: ({ row }) => {
        const party_datetime = row.original.party_datetime;
        const date = new Date(party_datetime);
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      },

      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;

        const party_datetime = row.original.party_datetime;
        const date = new Date(party_datetime);

        // Get hours and minutes from the time input (e.g., "14:30")
        const [filterHours, filterMinutes] = String(filterValue)
          .split(":")
          .map(Number);

        const rowHours = date.getHours();
        const rowMinutes = date.getMinutes();

        return rowHours === filterHours && rowMinutes === filterMinutes;
      },
    },
    {
      id: "contact_one",
      accessorFn: (row) =>
        `${row.contact_one.first_name} ${row.contact_one.last_name}`,
      header: "Contact One",
      enableColumnFilter: true,
      meta: {
        filterType: "text",
      },
      cell: ({ row }) => {
        const contact = row.original.contact_one;
        return contact ? (
          <GenericInfoChip
            chipKey={`party-${row.original.id}-contact-one`}
            shortName={`${contact.first_name} ${contact.last_name}`}
            title="Student Information"
            description="Detailed information about the selected student"
            sidebarContent={<StudentInfoChipDetails data={contact} />}
          />
        ) : (
          "—"
        );
      },

      filterFn: (row, _columnId, filterValue) => {
        const contact = row.original.contact_one;
        const fullName =
          `${contact.first_name} ${contact.last_name}`.toLowerCase();
        return fullName.includes(String(filterValue).toLowerCase());
      },
    },
    {
      id: "contact_two",
      accessorFn: (row) =>
        `${row.contact_two.first_name} ${row.contact_two.last_name}`,
      header: "Contact Two",
      enableColumnFilter: true,
      meta: {
        filterType: "text",
      },
      cell: ({ row }) => {
        const contact = row.original.contact_two;
        const partyId = row.original.id;
        if (!contact) return "—";
        return (
          <GenericInfoChip
            chipKey={`party-${partyId}-contact-two`}
            shortName={`${contact.first_name} ${contact.last_name}`}
            title="Contact Information"
            description="Detailed information about the second contact"
            sidebarContent={<ContactInfoChipDetails data={contact} />}
          />
        );
      },

      filterFn: (row, _columnId, filterValue) => {
        const contact = row.original.contact_two;
        const fullName =
          `${contact.first_name} ${contact.last_name}`.toLowerCase();
        return fullName.includes(String(filterValue).toLowerCase());
      },
    },
  ];

  return (
    <div className="space-y-4">
      <TableTemplate
        data={parties}
        columns={columns}
        resourceName="Party"
        initialSort={[{ id: "party_datetime", desc: true }]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreate}
        isLoading={partiesQuery.isLoading}
        error={partiesQuery.error as Error | null}
        getDeleteDescription={(party: PartyDto) =>
          `Are you sure you want to delete this party on ${new Date(
            party.party_datetime
          ).toLocaleString()}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
