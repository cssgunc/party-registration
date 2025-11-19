"use client";

import { Button } from "@/components/ui/button";
import { AdminPartyPayload, PartyService } from "@/services/partyService";
import { Party } from "@/types/api/party";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { isWithinInterval, startOfDay } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import PartyTableCreateEditForm from "./PartyTableCreateEdit";
import { TableTemplate } from "./TableTemplate";

const partyService = new PartyService();

export const PartyTable = () => {
    const queryClient = useQueryClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
    const [editingParty, setEditingParty] = useState<Party | null>(null);

    const partiesQuery = useQuery({
        queryKey: ["parties"],
        queryFn: () => partyService.listParties(),
        retry: 1,
    });

    const parties = (partiesQuery.data?.items ?? []).slice().sort(
        (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    const createMutation = useMutation({
        mutationFn: (payload: AdminPartyPayload) =>
            partyService.createParty(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            setSidebarOpen(false);
            setEditingParty(null);
        },
        onError: (error: Error) => {
            console.error("Failed to create party:", error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: AdminPartyPayload }) =>
            partyService.updateParty(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            setSidebarOpen(false);
            setEditingParty(null);
        },
        onError: (error: Error) => {
            console.error("Failed to update party:", error);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => partyService.deleteParty(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
        },
        onError: (error: Error) => {
            console.error("Failed to delete party:", error);
        },
    });

    const handleEdit = (party: Party) => {
        setEditingParty(party);
        setSidebarMode("edit");
        setSidebarOpen(true);
    };

    const handleDelete = (party: Party) => {
        deleteMutation.mutate(party.id);
    };

    const handleCreate = () => {
        setEditingParty(null);
        setSidebarMode("create");
        setSidebarOpen(true);
    };

    const handleFormSubmit = async (data: {
        address: string;
        partyDate: Date;
        partyTime: string;
        contactOneEmail: string;
        contactTwoEmail: string;
        contactTwoFirstName: string;
        contactTwoLastName: string;
        contactTwoPhoneNumber: string;
        contactTwoPreference: "call" | "text" | string;
    }) => {
        const [hours, minutes] = data.partyTime.split(":").map(Number);
        const datetime = new Date(data.partyDate);
        datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        const payload: AdminPartyPayload = {
            type: "admin",
            // Placeholder place_id until address->place mapping is wired
            place_id: data.address,
            party_datetime: datetime.toISOString(),
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
    const columns: ColumnDef<Party>[] = [
        {
            accessorKey: "location",
            header: "Address",
            enableColumnFilter: true,
            meta: {
                filterType: "text",
            },
            cell: ({ row }) => {
                const location = row.getValue("location") as {
                    streetNumber: string | null;
                    streetName: string | null;
                };
                if (!location?.streetNumber && !location?.streetName) {
                    return "—";
                }
                return `${location.streetNumber || ""} ${
                    location.streetName || ""
                }`.trim();
            },

            filterFn: (row, columnId, filterValue) => {
                const location = row.getValue(columnId) as {
                    streetNumber: string | null;
                    streetName: string | null;
                };
                const addressString = `${location.streetNumber || ""} ${
                    location.streetName || ""
                }`
                    .toLowerCase()
                    .trim();
                return addressString.includes(
                    String(filterValue).toLowerCase()
                );
            },
        },
        {
            accessorKey: "datetime",
            header: "Date",
            enableColumnFilter: true,
            meta: {
                filterType: "dateRange",
            },
            cell: ({ row }) => {
                const datetime = row.getValue("datetime") as Date;
                const date = new Date(datetime);
                return date.toLocaleDateString();
            },

            filterFn: (row, columnId, filterValue) => {
                if (!filterValue) return true;

                const dateRange = filterValue as DateRange;
                const datetime = row.getValue(columnId) as Date;
                const date = startOfDay(new Date(datetime));

                // If only 'from' date is selected
                if (dateRange.from && !dateRange.to) {
                    return (
                        date.getTime() === startOfDay(dateRange.from).getTime()
                    );
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
            accessorKey: "time",
            header: "Time",
            enableColumnFilter: true,
            meta: {
                filterType: "time",
            },
            cell: ({ row }) => {
                const datetime = row.getValue("datetime") as Date;
                const date = new Date(datetime);
                return date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                });
            },

            filterFn: (row, columnId, filterValue) => {
                if (!filterValue) return true;

                const datetime = row.original.datetime as Date;
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
            accessorKey: "contactOne",
            header: "Contact One",
            enableColumnFilter: true,
            meta: {
                filterType: "text",
            },
            cell: ({ row }) => {
                const contact = row.getValue("contactOne") as {
                    firstName: string;
                    lastName: string;
                };
                return contact
                    ? `${contact.firstName} ${contact.lastName}`
                    : "—";
            },

            filterFn: (row, columnId, filterValue) => {
                const contact = row.getValue(columnId) as {
                    firstName: string;
                    lastName: string;
                };
                const fullName =
                    `${contact.firstName} ${contact.lastName}`.toLowerCase();
                return fullName.includes(String(filterValue).toLowerCase());
            },
        },
        {
            accessorKey: "contactTwo",
            header: "Contact Two",
            enableColumnFilter: true,
            meta: {
                filterType: "text",
            },
            cell: ({ row }) => {
                const contact = row.getValue("contactTwo") as {
                    firstName: string;
                    lastName: string;
                };
                return contact
                    ? `${contact.firstName} ${contact.lastName}`
                    : "—";
            },

            filterFn: (row, columnId, filterValue) => {
                const contact = row.getValue(columnId) as {
                    firstName: string;
                    lastName: string;
                };
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

            {sidebarOpen && (
                <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-6 overflow-y-auto z-50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            {sidebarMode === "create" ? "New Party" : "Edit Party"}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                    <PartyTableCreateEditForm
                        onSubmit={handleFormSubmit}
                        editData={
                            editingParty
                                ? {
                                      address: editingParty.location
                                          ?.formattedAddress || "",
                                      partyDate: new Date(editingParty.datetime),
                                      partyTime: new Date(
                                          editingParty.datetime
                                      ).toTimeString().slice(0, 5),
                                      contactOneEmail:
                                          editingParty.contactOne?.email || "",
                                      contactTwoEmail:
                                          editingParty.contactTwo?.email || "",
                                      contactTwoFirstName:
                                          editingParty.contactTwo?.firstName || "",
                                      contactTwoLastName:
                                          editingParty.contactTwo?.lastName || "",
                                      contactTwoPhoneNumber:
                                          editingParty.contactTwo?.phoneNumber || "",
                                      contactTwoPreference:
                                          editingParty.contactTwo?.contactPreference ||
                                          "",
                                  }
                                : undefined
                        }
                    />
                </div>
            )}
        </div>
    );
};
