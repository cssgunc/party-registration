import { Location } from "@/types/api/location";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

// import { InfoChip } from "../ui/InfoChip";
// import { Checkbox } from "../ui/Checkbox";

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
            cell: ({ row }) => {
                const hold = row.getValue("holdExpirationDate") as string | null;
                if (hold) {
                    const formattedDate = new Date(hold).toLocaleDateString();
                    return `until ${formattedDate}`;
                }

                return "no active hold";
            }
        },
    ];

    return <TableTemplate data={data} columns={columns} details="Location table" />;
};