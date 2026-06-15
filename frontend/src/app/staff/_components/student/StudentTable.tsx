"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useDownloadStudentsCsv,
  useStudents,
  useUpdateIsRegistered,
  useUpdateStudent,
} from "@/lib/api/student/admin-student.queries";
import { StudentDto } from "@/lib/api/student/student.types";
import { getErrorMessage } from "@/lib/errors";
import {
  formatAddress,
  formatPhoneNumber,
  isFromThisSchoolYear,
} from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import LocationInfoChipDetails from "../shared/details/LocationInfoChipDetails";
import { FormSidebar } from "../shared/sidebar/FormSidebar";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { useFormSidebarState } from "../shared/sidebar/useFormSidebarState";
import { TableTemplate } from "../shared/table/TableTemplate";
import { editAction } from "../shared/table/rowActions";
import { useServerTableState } from "../shared/table/useServerTableState";
import StudentTableForm from "./StudentTableForm";

const STUDENT_ERROR_OPTIONS = {
  status: {
    404: "Student not found",
    409: "This phone number is taken by another student",
  },
  fallback: "Failed to update the student. Please try again.",
} as const;

const toEditData = (student: StudentDto) => ({
  ...student,
  phone_number: student.phone_number ?? "",
  contact_preference: student.contact_preference ?? undefined,
  residence_place_id: student.residence?.location.google_place_id ?? null,
});

export const StudentTable = () => {
  const { openSnackbar } = useSnackbar();
  const {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openEdit,
    closeSidebar,
  } = useFormSidebarState<StudentDto>();

  const exportMutation = useDownloadStudentsCsv();

  const checkboxMutation = useUpdateIsRegistered({
    onError: (error) =>
      openSnackbar(
        getErrorMessage(error, {
          fallback: "Failed to update registration status.",
        }),
        "error"
      ),
  });

  const editFormMutation = useUpdateStudent({
    onError: (error) => {
      setSubmissionError(getErrorMessage(error, STUDENT_ERROR_OPTIONS));
    },
    onSuccess: () => {
      closeSidebar();
      openSnackbar("Student updated successfully", "success");
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
        return formatPhoneNumber(number) || "—";
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

  const serverTableState = useServerTableState({
    columns,
    pageSizeStorageKey: "staff-students",
  });
  const query = useStudents(serverTableState.serverParams);

  return (
    <>
      <TableTemplate
        query={query}
        serverTableState={serverTableState}
        columns={columns}
        rowActions={[editAction<StudentDto>({ onClick: openEdit })]}
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
                submissionError={submissionError}
                isPending={editFormMutation.isPending}
              />
            ),
          },
        }}
        onClose={closeSidebar}
      />
    </>
  );
};
