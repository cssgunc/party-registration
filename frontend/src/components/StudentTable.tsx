import { Checkbox } from "@/components/ui/checkbox";
import { Student } from "@/types/api/student";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from 'react';
import { TableTemplate } from "./TableTemplate";
// import { InfoChip } from "@/components/ui/InfoChip";

export const StudentTable = ({ data }: { data: Student[] }) => {

    const [tableData, setTableData] = useState<Student[]>(data);

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
            cell: ({ row }) => {
                const pid = row.getValue("pid") as string;
                const student = tableData.find((s) => s.pid === pid);
                const isRegistered = !!student?.lastRegistered;
                return (
                    <Checkbox
                        checked={isRegistered}
                        onCheckedChange={(checked) => {
                            setTableData(prev =>
                                prev.map(student =>
                                    student.pid === pid
                                        ? {
                                            ...student,
                                            lastRegistered: checked ? new Date() : null, // set/remove date
                                        }
                                        : student
                                )
                            );
                        }}
                    />
                );
            },
        }
    ];

    return <TableTemplate data={data} columns={columns} details="Student table" />;
};