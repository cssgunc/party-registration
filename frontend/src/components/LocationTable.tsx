import { Location } from "@/types/api/location";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

export const LocationTable = ({ data }: { data: Location[] }) => {
    const columns: ColumnDef<Location>[] = [
        {
            accessorKey: "formattedAddress",
            header: "Address"
        },
        {
            accessorKey: "warningCount",
            header: "Warning Count"
        },
        {
            accessorKey: "citationCount",
            header: "Citation Count"
        },
        {
            accessorKey: "holdExpirationDate",
            header: "Active Hold",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const hold = row.getValue("holdExpirationDate") as string | null;
                if (hold) {
                    const formattedDate = new Date(hold).toLocaleDateString();
                    return `until ${formattedDate}`;
                }
                return "no active hold";
            },

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
