import { Location } from "@/types/api/location";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

export const LocationTable = ({ data }: { data: Location[] }) => {
    const columns: ColumnDef<Location>[] = [
        {
            accessorKey: "formatted_address",
            header: "Address",
            enableColumnFilter: true,
        },
        {
            accessorKey: "warning_count",
            header: "Warning Count",
            enableColumnFilter: true,
        },
        {
            accessorKey: "citation_count",
            header: "Citation Count",
            enableColumnFilter: true,
        },
        {
            accessorKey: "hold_expiration",
            header: "Active Hold",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const hold = row.getValue("hold_expiration") as string | null;
                if (hold) {
                    const formattedDate = new Date(hold).toLocaleDateString();
                    return `until ${formattedDate}`;
                }
                return "no active hold";
            },
            // Custom filter to search formatted hold text
            filterFn: (row, columnId, filterValue) => {
                const hold = row.getValue(columnId) as string | null;
                const displayText = hold
                    ? `until ${new Date(hold).toLocaleDateString()}`
                    : "no active hold";
                return displayText
                    .toLowerCase()
                    .includes(String(filterValue).toLowerCase());
            },
        },
    ];

    return (
        <TableTemplate data={data} columns={columns} details="Location table" />
    );
};
