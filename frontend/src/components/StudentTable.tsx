import { Checkbox } from "@/components/ui/checkbox";
import { Student } from "@/types/api/student";
import { ColumnDef } from "@tanstack/react-table";
import { TableTemplate } from "./TableTemplate";
// import { InfoChip } from "@/components/ui/InfoChip";

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
            header: "Phone Number",
            cell: ({ row }) => {
                const number = row.getValue("phoneNumber") as string;
                return number ? `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6, 10)}` : "—";
            },
        },
        {
            accessorKey: "contactPreference",
            header: "Contact Preference"
        },
        {
            accessorKey: "lastRegistered",
            header: "Is Registered",
            cell: ({ row }) => { // TODO: implement functionality/toggability for checkbox
                const registered = row.getValue("lastRegistered") as boolean
                return (<Checkbox
                    checked={!!registered}
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