import { Checkbox } from "@/components/ui/checkbox";
import { Student } from "@/types/api/student";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";

// import { InfoChip } from "../ui/InfoChip";
// import { Checkbox } from "../ui/Checkbox";

export const StudentTable = ({ data }: { data: Student[] }) => {

    const columns: ColumnDef<Student>[] = [
        {
            accessorKey: "pid",
            header: "PID"
        },
        {
            accessorKey: "firstName",
            header: "First Name"
        },
        {
            accessorKey: "lastName",
            header: "Last Name"
        },
        {
            accessorKey: "email",
            header: "Email"
        },
        {
            accessorKey: "phoneNumber",
            header: "Phone Number"
        },
        {
            accessorKey: "contactPreference",
            header: "Contact Preference"
        },
        {
            accessorKey: "lastRegistered",
            header: "Is Registered",
            cell: ({ row }) => {
                const registered = row.getValue("lastRegistered") as boolean
                return (<Checkbox
                    checked={registered}
                // onCheckedChange={(value) => row.toggleSelected(!!value)}
                />
                )
            },
        }
    ];

    // id: "select",
    // header: ({ table }) => (
    //   <Checkbox
    //     checked={
    //       table.getIsAllPageRowsSelected() ||
    //       (table.getIsSomePageRowsSelected() && "indeterminate")
    //     }
    //     onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //     aria-label="Select all"
    //   />
    // ),
    // cell: ({ row }) => (
    //   <Checkbox
    //     checked={row.getIsSelected()}
    //     onCheckedChange={(value) => row.toggleSelected(!!value)}
    //     aria-label="Select row"
    //   />
    // ),

    return <TableTemplate data={data} columns={columns} details="Student table" />;
};