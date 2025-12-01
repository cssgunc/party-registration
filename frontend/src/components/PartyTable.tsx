"use client";

import {
  AdminPartyPayload,
  PaginatedPartiesResponse,
  PartyService,
} from "@/services/partyService";
import { Party } from "@/types/api/party";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { format, isWithinInterval, startOfDay } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import ContactInfoChipDetails from "./ContactInfoChipDetails";
import { GenericInfoChip } from "./GenericInfoChip";
import LocationInfoChipDetails from "./LocationInfoChipDetails";
import PartyTableCreateEditForm from "./PartyTableCreateEdit";
import { useSidebar } from "./SidebarContext";
import StudentInfoChipDetails from "./StudentInfoChipDetails";
import { TableTemplate } from "./TableTemplate";

const partyService = new PartyService();

export const PartyTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const partiesQuery = useQuery({
    queryKey: ["parties"],
    queryFn: () => partyService.listParties(),
    retry: 1,
  });

  const parties = partiesQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: AdminPartyPayload) =>
      partyService.createParty(payload),
    onError: (error: Error) => {
      console.error("Failed to create party:", error);

      // Check if it's a 404 error (student not found)
      if (
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        setSubmissionError(
          "Student not found. Please verify the first contact email belongs to a registered student."
        );
      } else {
        setSubmissionError(`Failed to create party: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      closeSidebar();
      setEditingParty(null);
      setSubmissionError(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminPartyPayload }) =>
      partyService.updateParty(id, payload),
    onError: (error: Error) => {
      console.error("Failed to update party:", error);

      // Check if it's a 404 error (student not found)
      if (
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        setSubmissionError(
          "Student not found. Please verify the first contact email belongs to a registered student."
        );
      } else {
        setSubmissionError(`Failed to update party: ${error.message}`);
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

      const previous = queryClient.getQueryData<PaginatedPartiesResponse>([
        "parties",
      ]);

      queryClient.setQueryData<PaginatedPartiesResponse>(
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

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setSidebarMode("edit");
    setSubmissionError(null);
    openSidebar(
      `edit-party-${party.id}`,
      "Edit Party",
      "Update party information",
      <PartyTableCreateEditForm
        title="Edit Party"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
        editData={party}
      />
    );
  };

  const handleDelete = (party: Party) => {
    deleteMutation.mutate(party.id);
  };

  const handleCreate = () => {
    setEditingParty(null);
    setSidebarMode("create");
    setSubmissionError(null);
    openSidebar(
      "create-party",
      "New Party",
      "Add a new party to the system",
      <PartyTableCreateEditForm
        title="New Party"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
      />
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
    // Check if we're editing and if date/time have changed
    let party_datetime_str: string;

    if (sidebarMode === "edit" && editingParty) {
      // Get original datetime components from the Date object
      const originalDate = new Date(editingParty.datetime);
      const originalDateStr = `${originalDate.getFullYear()}-${String(
        originalDate.getMonth() + 1
      ).padStart(2, "0")}-${String(originalDate.getDate()).padStart(2, "0")}`;
      const originalTimeStr = `${String(originalDate.getHours()).padStart(
        2,
        "0"
      )}:${String(originalDate.getMinutes()).padStart(2, "0")}`;

      // Get new date components
      const newDateStr = `${data.partyDate.getFullYear()}-${String(
        data.partyDate.getMonth() + 1
      ).padStart(2, "0")}-${String(data.partyDate.getDate()).padStart(2, "0")}`;

      // If date and time haven't changed, use the original datetime string from backend
      if (
        originalDateStr === newDateStr &&
        originalTimeStr === data.partyTime
      ) {
        // Use the raw datetime string directly to avoid any timezone conversion
        party_datetime_str = editingParty.datetime.toISOString().slice(0, 19);
      } else {
        // Date or time changed, reconstruct
        const [hours, minutes] = data.partyTime.split(":").map(Number);
        const datetime = new Date(data.partyDate);
        datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        const year = datetime.getFullYear();
        const month = String(datetime.getMonth() + 1).padStart(2, "0");
        const day = String(datetime.getDate()).padStart(2, "0");
        const hour = String(datetime.getHours()).padStart(2, "0");
        const minute = String(datetime.getMinutes()).padStart(2, "0");
        const second = String(datetime.getSeconds()).padStart(2, "0");
        party_datetime_str = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      }
    } else {
      // Creating new party
      const [hours, minutes] = data.partyTime.split(":").map(Number);
      const datetime = new Date(data.partyDate);
      datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const year = datetime.getFullYear();
      const month = String(datetime.getMonth() + 1).padStart(2, "0");
      const day = String(datetime.getDate()).padStart(2, "0");
      const hour = String(datetime.getHours()).padStart(2, "0");
      const minute = String(datetime.getMinutes()).padStart(2, "0");
      const second = String(datetime.getSeconds()).padStart(2, "0");
      party_datetime_str = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    const payload: AdminPartyPayload = {
      type: "admin",
      placeId: data.placeId,
      partyDatetime: new Date(party_datetime_str),
      contactOneEmail: data.contactOneEmail,
      contactTwo: {
        email: data.contactTwoEmail,
        firstName: data.contactTwoFirstName,
        lastName: data.contactTwoLastName,
        phoneNumber: data.contactTwoPhoneNumber,
        contactPreference:
          (data.contactTwoPreference as "call" | "text") ?? "call",
      },
    };

    if (sidebarMode === "edit" && editingParty) {
      updateMutation.mutate({ id: editingParty.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };
  const columns: ColumnDef<Party>[] = [
    {
      id: "location",
      accessorFn: (row) => row.location.formattedAddress,
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
            shortName={location.formattedAddress}
            sidebarContent={<LocationInfoChipDetails data={location} />}
          />
        );
      },

      filterFn: (row, _columnId, filterValue) => {
        const location = row.original.location;
        const addressString = `${location.streetNumber || ""} ${
          location.streetName || ""
        }`
          .toLowerCase()
          .trim();
        return addressString.includes(String(filterValue).toLowerCase());
      },
    },
    {
      id: "datetime",
      accessorFn: (row) => format(row.datetime, "MM-dd-yyyy"),
      header: "Date",
      enableColumnFilter: true,
      meta: {
        filterType: "dateRange",
      },
      cell: ({ row }) => {
        const datetime = row.original.datetime;
        const date = new Date(datetime);
        return date.toLocaleDateString();
      },

      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;

        const dateRange = filterValue as DateRange;
        const datetime = row.original.datetime;
        const date = startOfDay(new Date(datetime));

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
      accessorFn: (row) => format(row.datetime, "HH:mm"),
      header: "Time",
      enableColumnFilter: true,
      meta: {
        filterType: "time",
      },
      cell: ({ row }) => {
        const datetime = row.original.datetime;
        const date = new Date(datetime);
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      },

      filterFn: (row, _columnId, filterValue) => {
        if (!filterValue) return true;

        const datetime = row.original.datetime;
        const date = new Date(datetime);

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
      id: "contactOne",
      accessorFn: (row) =>
        `${row.contactOne.firstName} ${row.contactOne.lastName}`,
      header: "Contact One",
      enableColumnFilter: true,
      meta: {
        filterType: "text",
      },
      cell: ({ row }) => {
        const contact = row.original.contactOne;
        return contact ? (
          <GenericInfoChip
            chipKey={`party-${row.original.id}-contact-one`}
            shortName={`${contact.firstName} ${contact.lastName}`}
            title="Student Information"
            description="Detailed information about the selected student"
            sidebarContent={<StudentInfoChipDetails data={contact} />}
          />
        ) : (
          "—"
        );
      },

      filterFn: (row, _columnId, filterValue) => {
        const contact = row.original.contactOne;
        const fullName =
          `${contact.firstName} ${contact.lastName}`.toLowerCase();
        return fullName.includes(String(filterValue).toLowerCase());
      },
    },
    {
      id: "contactTwo",
      accessorFn: (row) =>
        `${row.contactTwo.firstName} ${row.contactTwo.lastName}`,
      header: "Contact Two",
      enableColumnFilter: true,
      meta: {
        filterType: "text",
      },
      cell: ({ row }) => {
        const contact = row.original.contactTwo;
        const partyId = row.original.id;
        if (!contact) return "—";
        return (
          <GenericInfoChip
            chipKey={`party-${partyId}-contact-two`}
            shortName={`${contact.firstName} ${contact.lastName}`}
            title="Contact Information"
            description="Detailed information about the second contact"
            sidebarContent={<ContactInfoChipDetails data={contact} />}
          />
        );
      },

      filterFn: (row, _columnId, filterValue) => {
        const contact = row.original.contactTwo;
        const fullName =
          `${contact.firstName} ${contact.lastName}`.toLowerCase();
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
        initialSort={[{ id: "datetime", desc: true }]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreate}
        isLoading={partiesQuery.isLoading}
        error={partiesQuery.error as Error | null}
        getDeleteDescription={(party: Party) =>
          `Are you sure you want to delete this party on ${new Date(
            party.datetime
          ).toLocaleString()}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
