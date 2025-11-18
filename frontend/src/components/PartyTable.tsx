import { Party } from "@/types/api/party";
import { ColumnDef } from "@tanstack/react-table";
import { isWithinInterval, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { TableTemplate } from "./TableTemplate";

export const PartyTable = ({ data }: { data: Party[] }) => {
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
        <TableTemplate data={data} columns={columns} details="Party table" />
    );
};
