import { Party } from "@/types/api/party";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

// import { InfoChip } from "../ui/InfoChip";
// import { Checkbox } from "../ui/Checkbox";

export const PartyTable = ({ data }: { data: Party[] }) => {

    const columns: ColumnDef<Party>[] = [
        {
            accessorKey: "location",
            header: "Address",
            cell: ({ row }) => {
                const address = row.getValue("location") as { streetNumber: string, streetName: string };
                return address ? `${address.streetNumber} ${address.streetName}` : "—";
            },
            // TODO: format as location info chip
        },
        {
            accessorKey: "datetime",
            header: "Date",
            cell: ({ row }) => {
                const datetime = row.getValue("datetime") as string;
                const date = new Date(datetime);
                return date.toLocaleDateString(); // e.g., "11/3/2025"
            },
        },
        {
            accessorKey: "time",
            header: "Time",
            cell: ({ row }) => {
                const datetime = row.getValue("datetime") as string;
                const date = new Date(datetime);
                return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // e.g., "03:30 PM"
            },
        },
        {
            accessorKey: "contactOne",
            header: "Contact One",
            cell: ({ row }) => {
                const contact = row.getValue("contactOne") as { firstName: string; lastName: string };
                return contact ? `${contact.firstName} ${contact.lastName}` : "—";
            },
            // TODO: format as student info chip
        },
        {
            accessorKey: "contactTwo",
            header: "Contact Two",
            cell: ({ row }) => {
                const contact = row.getValue("contactTwo") as { firstName: string; lastName: string };
                return contact ? `${contact.firstName} ${contact.lastName}` : "—";
            },
            // TODO: format as student info chip
        },
    ];

    return <TableTemplate data={data} columns={columns} details="Party table" />;
};