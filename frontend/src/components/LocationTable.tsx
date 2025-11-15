import { Location } from "@/types/api/location";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

export const LocationTable = ({ data }: { data: Location[] }) => {
    const columns: ColumnDef<Location>[] = [
        {
            accessorKey: "formattedAddress",
            header: "Address",
        },
        {
            accessorKey: "warningCount",
            header: "Warning Count",
        },
        {
            accessorKey: "citationCount",
            header: "Citation Count",
        },
        {
            accessorKey: "holdExpirationDate",
            header: "Active Hold",
            enableColumnFilter: true,
            cell: ({ row }) => {
                const holdDate = row.getValue(
                    "holdExpirationDate"
                ) as Date | null;
                if (holdDate) {
                    const formattedDate = new Date(
                        holdDate
                    ).toLocaleDateString();
                    return `until ${formattedDate}`;
                }
                return "no active hold";
            },

            filterFn: (row, columnId, filterValue) => {
                const holdDate = row.getValue(columnId) as Date | null;
                const displayText = holdDate
                    ? `until ${new Date(holdDate).toLocaleDateString()}`
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
