import { Party } from "@/types/api/party";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

export const PartyTable = ({ data }: { data: Party[] }) => {
    const columns: ColumnDef<Party>[] = [
        {
            accessorKey: "location",
            header: "Address",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const address = row.getValue("location") as {
                    street_number: string;
                    street_name: string;
                };
                return address
                    ? `${address.street_number} ${address.street_name}`
                    : "—";
            },
            // Custom filter function to search within nested object
            filterFn: (row, columnId, filterValue) => {
                const location = row.getValue(columnId) as {
                    street_number: string;
                    street_name: string;
                };
                const addressString =
                    `${location.street_number} ${location.street_name}`.toLowerCase();
                return addressString.includes(
                    String(filterValue).toLowerCase()
                );
            },
        },
        {
            accessorKey: "datetime",
            header: "Date",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const datetime = row.getValue("datetime") as Date;
                const date = new Date(datetime);
                return date.toLocaleDateString();
            },
            // Custom filter to search formatted date
            filterFn: (row, columnId, filterValue) => {
                const datetime = row.getValue(columnId) as Date;
                const date = new Date(datetime);
                const dateString = date.toLocaleDateString();
                return dateString.includes(String(filterValue));
            },
        },
        {
            accessorKey: "time",
            header: "Time",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const datetime = row.getValue("datetime") as Date;
                const date = new Date(datetime);
                return date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                });
            },
            // Custom filter to search formatted time
            filterFn: (row, columnId, filterValue) => {
                const datetime = row.original.datetime as Date;
                const date = new Date(datetime);
                const timeString = date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                return timeString.includes(String(filterValue));
            },
        },
        {
            accessorKey: "contact_one",
            header: "Contact One",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const contact = row.getValue("contact_one") as {
                    firstName: string;
                    lastName: string;
                };
                return contact
                    ? `${contact.firstName} ${contact.lastName}`
                    : "—";
            },
            // Custom filter to search within nested object
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
            accessorKey: "contact_two",
            header: "Contact Two",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const contact = row.getValue("contact_two") as {
                    firstName: string;
                    lastName: string;
                };
                return contact
                    ? `${contact.firstName} ${contact.lastName}`
                    : "—";
            },
            // Custom filter to search within nested object
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
