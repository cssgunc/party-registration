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
        // Optimistically add the new party to the cache so the table updates
        // immediately on create.
        onMutate: async (payload: AdminPartyPayload) => {
            await queryClient.cancelQueries({ queryKey: ["parties"] });

            const previous = queryClient.getQueryData<{
                items: Party[];
                [key: string]: unknown;
            } | Party[]>(["parties"]);

            queryClient.setQueryData(["parties"], (old: unknown) => {
                const optimisticParty: Party = {
                    id: -Math.floor(Math.random() * 1_000_000),
                    datetime: new Date(payload.party_datetime),
                    rawDatetime: payload.party_datetime,
                    // These shapes match what Party likely looks like; any
                    // missing fields will be filled in by the server refresh.
                    location: {
                        formattedAddress: payload.place_id,
                    } as Party["location"],
                    contactOne: {
                        email: payload.contact_one_email,
                        firstName: "",
                        lastName: "",
                        phoneNumber: "",
                        contactPreference: "call",
                    },
                    contactTwo: {
                        email: payload.contact_two.email,
                        firstName: payload.contact_two.first_name,
                        lastName: payload.contact_two.last_name,
                        phoneNumber: payload.contact_two.phone_number,
                        contactPreference: payload.contact_two.contact_preference,
                    },
                } as Party;

                if (
                    old &&
                    typeof old === "object" &&
                    Array.isArray((old as { items?: Party[] }).items)
                ) {
                    const paginated = old as {
                        items: Party[];
                        [key: string]: unknown;
                    };
                    return {
                        ...paginated,
                        items: [optimisticParty, ...paginated.items],
                    };
                }

                if (Array.isArray(old)) {
                    return [optimisticParty, ...(old as Party[])];
                }

                return [optimisticParty];
            });

            return { previous };
        },
        onError: (error: Error, _vars, context) => {
            console.error("Failed to create party:", error);
            
            // Check if it's a 404 error (student not found)
            if ('response' in error && (error as { response?: { status?: number } }).response?.status === 404) {
                setSubmissionError("Student not found. Please verify the first contact email belongs to a registered student.");
            } else {
                setSubmissionError(`Failed to create party: ${error.message}`);
            }
            
            if (context?.previous) {
                queryClient.setQueryData(["parties"], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            setSidebarOpen(false);
            setEditingParty(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: AdminPartyPayload }) =>
            partyService.updateParty(id, payload),
        onError: (error: Error) => {
            console.error("Failed to update party:", error);
            
            // Check if it's a 404 error (student not found)
            if ('response' in error && (error as { response?: { status?: number } }).response?.status === 404) {
                setSubmissionError("Student not found. Please verify the first contact email belongs to a registered student.");
            } else {
                setSubmissionError(`Failed to update party: ${error.message}`);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            setSidebarOpen(false);
            setEditingParty(null);
        },
    });    const deleteMutation = useMutation({
        mutationFn: (id: number) => partyService.deleteParty(id),
        // Optimistically remove the party from the cache.
        onMutate: async (id: number) => {
            await queryClient.cancelQueries({ queryKey: ["parties"] });

            const previous = queryClient.getQueryData<{
                items: Party[];
                [key: string]: unknown;
            } | Party[]>(["parties"]);

            queryClient.setQueryData(["parties"], (old: unknown) => {
                if (
                    old &&
                    typeof old === "object" &&
                    Array.isArray((old as { items?: Party[] }).items)
                ) {
                    const paginated = old as {
                        items: Party[];
                        [key: string]: unknown;
                    };
                    return {
                        ...paginated,
                        items: paginated.items.filter((p) => p.id !== id),
                    };
                }

                if (Array.isArray(old)) {
                    return (old as Party[]).filter((p) => p.id !== id);
                }

                return old;
            });

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
        setSidebarOpen(true);
    };

    const handleDelete = (party: Party) => {
        deleteMutation.mutate(party.id);
    };

    const handleCreate = () => {
        setEditingParty(null);
        setSidebarMode("create");
        setSubmissionError(null);
        setSidebarOpen(true);
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
            const originalDateStr = `${originalDate.getFullYear()}-${String(originalDate.getMonth() + 1).padStart(2, '0')}-${String(originalDate.getDate()).padStart(2, '0')}`;
            const originalTimeStr = `${String(originalDate.getHours()).padStart(2, '0')}:${String(originalDate.getMinutes()).padStart(2, '0')}`;
            
            // Get new date components
            const newDateStr = `${data.partyDate.getFullYear()}-${String(data.partyDate.getMonth() + 1).padStart(2, '0')}-${String(data.partyDate.getDate()).padStart(2, '0')}`;
            
            // If date and time haven't changed, use the original datetime string from backend
            if (originalDateStr === newDateStr && originalTimeStr === data.partyTime) {
                // Use the raw datetime string directly to avoid any timezone conversion
                party_datetime_str = editingParty.rawDatetime;
            } else {
                // Date or time changed, reconstruct
                const [hours, minutes] = data.partyTime.split(":").map(Number);
                const datetime = new Date(data.partyDate);
                datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);
                
                const year = datetime.getFullYear();
                const month = String(datetime.getMonth() + 1).padStart(2, '0');
                const day = String(datetime.getDate()).padStart(2, '0');
                const hour = String(datetime.getHours()).padStart(2, '0');
                const minute = String(datetime.getMinutes()).padStart(2, '0');
                const second = String(datetime.getSeconds()).padStart(2, '0');
                party_datetime_str = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
            }
        } else {
            // Creating new party
            const [hours, minutes] = data.partyTime.split(":").map(Number);
            const datetime = new Date(data.partyDate);
            datetime.setHours(hours ?? 0, minutes ?? 0, 0, 0);
            
            const year = datetime.getFullYear();
            const month = String(datetime.getMonth() + 1).padStart(2, '0');
            const day = String(datetime.getDate()).padStart(2, '0');
            const hour = String(datetime.getHours()).padStart(2, '0');
            const minute = String(datetime.getMinutes()).padStart(2, '0');
            const second = String(datetime.getSeconds()).padStart(2, '0');
            party_datetime_str = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }

        const payload: AdminPartyPayload = {
            type: "admin",
            place_id: data.placeId,
            party_datetime: party_datetime_str,
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
                        submissionError={submissionError}
                        editData={
                            editingParty
                                ? {
                                      address: editingParty.location
                                          ?.formattedAddress || "",
                                      placeId: editingParty.location
                                          ?.googlePlaceId || "",
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
