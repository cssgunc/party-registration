import { Checkbox } from "@/components/ui/checkbox";
import { Student } from "@/types/api/student";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { TableTemplate } from "./TableTemplate";

export const StudentTable = ({ data }: { data: Student[] }) => {
  const [tableData, setTableData] = useState<Student[]>(data);

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "pid",
      header: "PID",
      enableColumnFilter: true,
    },
    {
      accessorKey: "firstName",
      header: "First Name",
      enableColumnFilter: true,
    },
    {
      accessorKey: "lastName",
      header: "Last Name",
      enableColumnFilter: true,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableColumnFilter: true,
    },
    {
      accessorKey: "phoneNumber",
      header: "Phone Number",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const number = row.getValue("phoneNumber") as string;
        return number
          ? `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(
              6,
              10
            )}`
          : "—";
      },
    },
    {
      accessorKey: "contactPreference",
      header: "Contact Preference",
      enableColumnFilter: true,
      meta: {
        filterType: "select",
        selectOptions: ["call", "text"],
      },
    },
    {
      accessorKey: "lastRegistered",
      header: "Is Registered",
      enableColumnFilter: false, // disable filtering for checkbox column
      cell: ({ row }) => {
        const pid = row.getValue("pid") as string;
        const student = tableData.find((s) => s.pid === pid);
        const isRegistered = !!student?.lastRegistered;
        return (
          <Checkbox
            checked={isRegistered}
            onCheckedChange={(checked: boolean) => {
              setTableData((prev) =>
                prev.map((student) =>
                  student.pid === pid
                    ? {
                        ...student,
                        lastRegistered: checked ? new Date() : null,
                      }
                    : student
                )
              );
            }}
          />
        );
      },
    },
  ];

  return (
    <TableTemplate data={data} columns={columns} details="Student table" />
  );
};
