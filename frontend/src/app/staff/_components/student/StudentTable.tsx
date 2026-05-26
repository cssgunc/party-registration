"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useDeleteStudent,
  useDownloadStudentsCsv,
  useStudents,
  useUpdateIsRegistered,
  useUpdateStudent,
} from "@/lib/api/student/admin-student.queries";
import { StudentDto } from "@/lib/api/student/student.types";
import { getErrorMessage } from "@/lib/errors";
import { formatAddress, isFromThisSchoolYear } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import LocationInfoChipDetails from "../shared/details/LocationInfoChipDetails";
import { FormSidebar } from "../shared/sidebar/FormSidebar";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { useFormSidebarState } from "../shared/sidebar/useFormSidebarState";
import { TableTemplate } from "../shared/table/TableTemplate";
import { deleteAction, editAction } from "../shared/table/rowActions";
import StudentTableForm from "./StudentTableForm";

const STUDENT_ERROR_OPTIONS = {
  status: {
    404: "Student not found",
    409: "This phone number is taken by another student",
  },
} as const;

const toEditData = (student: StudentDto) => ({
  ...student,
  phone_number: student.phone_number ?? "",
  contact_preference: student.contact_preference ?? undefined,
  residence_place_id: student.residence?.location.google_place_id ?? null,
});

export const StudentTable = () => {
  const { openSnackbar } = useSnackbar();
  const { mode, row, openEdit, closeSidebar } =
    useFormSidebarState<StudentDto>();

  const exportMutation = useDownloadStudentsCsv();

  const checkboxMutation = useUpdateIsRegistered();

  const editFormMutation = useUpdateStudent({
    onOptimisticUpdate: () => {
      // Optimistic close — toast handles error visibility (no reopen).
      closeSidebar();
    },
    onError: (error) => {
      openSnackbar(getErrorMessage(error, STUDENT_ERROR_OPTIONS), "error");
    },
    onSuccess: () => {
      openSnackbar("Student updated successfully", "success");
    },
  });

  const deleteMutation = useDeleteStudent({
    onError: (error) => {
      console.error("Failed to delete student:", error);
    },
    onSuccess: () => {
      openSnackbar("Student deleted successfully", "success");
    },
  });

  const columns: ColumnDef<StudentDto>[] = [
    {
      accessorKey: "onyen",
      header: "Onyen",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "onyen" } },
    },
    {
      accessorKey: "pid",
      header: "PID",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "pid" } },
    },
    {
      accessorKey: "first_name",
      header: "First Name",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "first_name" } },
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "last_name" } },
    },
    {
      accessorKey: "email",
      header: "Email",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "email" } },
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const number = row.getValue("phone_number") as string;
        return number
          ? `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6, 10)}`
          : "—";
      },
      meta: { filter: { type: "text", backendField: "phone_number" } },
    },
    {
      accessorKey: "contact_preference",
      header: "Call/Text",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "contact_preference",
          selectOptions: ["Call", "Text"],
        },
      },
      cell: ({ row }) => {
        const preference =
          row.getValue<StudentDto["contact_preference"]>("contact_preference");
        if (!preference) return "—";
        return preference === "call" ? "Call" : "Text";
      },
    },
    {
      id: "residence",
      accessorFn: (row) => row.residence?.location?.formatted_address ?? "",
      header: "Residence",
      enableColumnFilter: true,
      meta: {
        filter: { type: "text", backendField: "residence", nullable: true },
      },
      cell: ({ row }) => {
        const student = row.original;
        const hasValidResidence =
          student.residence &&
          isFromThisSchoolYear(student.residence.residence_chosen_date);
        if (!hasValidResidence || !student.residence) {
          return "—";
        }
        const location = student.residence.location;
        const shortName = formatAddress(location, [
          "street_number",
          "street_name",
        ]);
        return (
          <InfoChip
            chipKey={`student-${student.id}-residence`}
            title="Info about the Location"
            description="Detailed information about the student's residence"
            shortName={shortName || location.formatted_address}
            sidebarContent={<LocationInfoChipDetails data={location} />}
          />
        );
      },
    },
    {
      accessorKey: "last_registered",
      header: "Is Registered",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "last_registered",
          filterField: "is_registered",
          selectOptions: ["True", "False"],
        },
      },
      cell: ({ row }) => {
        const student = row.original;
        const isRegistered = isFromThisSchoolYear(student.last_registered);
        return (
          <Checkbox
            checked={isRegistered}
            onCheckedChange={(checked: boolean) => {
              checkboxMutation.mutate({
                id: student.id,
                data: { is_registered: checked },
              });
            }}
            disabled={checkboxMutation.isPending}
          />
        );
      },
    },
  ];

  return (
    <>
      <TableTemplate
        useQuery={useStudents}
        columns={columns}
        rowActions={[
          editAction<StudentDto>({ onClick: openEdit }),
          deleteAction<StudentDto>({
            onClick: (student) => deleteMutation.mutate(student.id),
            resourceName: "Student",
            description: (student) =>
              `Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone.`,
            isPending: deleteMutation.isPending,
          }),
        ]}
        exportMutation={exportMutation}
      />
      <FormSidebar
        mode={mode}
        row={row}
        modes={{
          edit: {
            key: (student) => `edit-student-${student.id}`,
            title: "Edit Student",
            description: "Update student information",
            render: (student) => (
              <StudentTableForm
                onSubmit={(data) =>
                  editFormMutation.mutate({ id: student.id, data })
                }
                editData={toEditData(student)}
              />
            ),
          },
        }}
        onClose={closeSidebar}
      />
    </>
  );
};
