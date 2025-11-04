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
                const address = row.getValue("location") as { street_number: string, street_name: string };
                return address ? `${address.street_number} ${address.street_name}` : "—";
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
            accessorKey: "contact_one",
            header: "Contact One",
            cell: ({ row }) => {
                const contact = row.getValue("contact_one") as { firstName: string; lastName: string };
                return contact ? `${contact.firstName} ${contact.lastName}` : "—";
            },
            // TODO: format as student info chip
        },
        {
            accessorKey: "contact_two",
            header: "Contact Two",
            cell: ({ row }) => {
                const contact = row.getValue("contact_two") as { firstName: string; lastName: string };
                return contact ? `${contact.firstName} ${contact.lastName}` : "—";
            },
            // TODO: format as student info chip
        },
    ];

    return <TableTemplate data={data} columns={columns} details="Party table" />;
};