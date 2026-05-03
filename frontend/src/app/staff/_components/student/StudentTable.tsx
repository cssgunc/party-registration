"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  DEFAULT_TABLE_PARAMS,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import {
  useDeleteStudent,
  useDownloadStudentsCsv,
  useStudents,
  useUpdateIsRegistered,
  useUpdateStudent,
} from "@/lib/api/student/admin-student.queries";
import { StudentDto, StudentUpdateDto } from "@/lib/api/student/student.types";
import { isFromThisSchoolYear } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useState } from "react";
import LocationInfoChipDetails from "../party/details/LocationInfoChipDetails";
import { InfoChip } from "../shared/sidebar/InfoChip";
import { TableTemplate } from "../shared/table/TableTemplate";
import StudentTableForm from "./StudentTableForm";

const hasStudentChanged = (
  original: StudentDto | null,
  updated: StudentUpdateDto
): boolean => {
  if (!original) return true;

  return (
    original.first_name !== updated.first_name ||
    original.last_name !== updated.last_name ||
    original.phone_number !== updated.phone_number ||
    original.contact_preference !== updated.contact_preference ||
    original.last_registered?.getTime() !== updated.last_registered?.getTime()
  );
};

const toEditData = (student: StudentDto) => ({
  ...student,
  phone_number: student.phone_number ?? "",
  contact_preference: student.contact_preference ?? undefined,
  residence_place_id: student.residence?.location.google_place_id ?? null,
});

const getErrorMessage = (error: Error): string => {
  if (isAxiosError(error)) {
    const detail = error.response?.data as {
      message?: string;
      detail?: string;
    };
    switch (error.response?.status) {
      case 409:
        return "This phone number is taken by another student.";
      case 404:
        return "Student not found.";
      case 403:
        return "You do not have permission to perform this action.";
      case 500:
        return "Server error. Please try again later.";
    }
    if (detail?.detail) return String(detail.detail);
    if (detail?.message) return String(detail.message);
    if (error.message) return error.message;
  }
  return "Operation failed";
};

export const StudentTable = () => {
  const { openSnackbar } = useSnackbar();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const studentsQuery = useStudents(serverParams);
  const students = studentsQuery.data?.items ?? [];

  const { mutate: exportCsv, isPending: isExporting } =
    useDownloadStudentsCsv();

  const checkboxMutation = useUpdateIsRegistered();

  const editFormMutation = useUpdateStudent({
    onOptimisticUpdate: () => {
      closeSidebar();
      setEditingStudent(null);
    },
    onError: (error) => {
      if (!editingStudent) return;

      openSidebar(
        `edit-student-${editingStudent.id}`,
        "Edit Student",
        "Update student information",
        <StudentTableForm
          onSubmit={(data) => handleEditSubmit(editingStudent, data)}
          submissionError={getErrorMessage(error)}
          editData={toEditData(editingStudent)}
        />
      );
    },
    onSuccess: (data, variables) => {
      if (hasStudentChanged(editingStudent, variables.data)) {
        openSnackbar("Student updated successfully", "success");
      }
      closeSidebar();
      setEditingStudent(null);
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

  const handleEdit = (student: StudentDto) => {
    setEditingStudent(student);
    openSidebar(
      `edit-student-${student.id}`,
      "Edit Student",
      "Update student information",
      <StudentTableForm
        onSubmit={(data) => handleEditSubmit(student, data)}
        editData={toEditData(student)}
      />
    );
  };

  const handleDelete = (student: StudentDto) => {
    deleteMutation.mutate(student.id);
  };

  const handleEditSubmit = async (
    student: StudentDto,
    data: StudentUpdateDto
  ) => {
    editFormMutation.mutate({ id: student.id, data });
  };

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
        const shortName = [location.street_number, location.street_name]
          .filter(Boolean)
          .join(" ");
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
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={students}
        columns={columns}
        resourceName="Student"
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={studentsQuery.isLoading}
        isFetching={studentsQuery.isFetching}
        error={studentsQuery.error}
        getDeleteDescription={(student: StudentDto) =>
          `Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        serverMeta={
          studentsQuery.data
            ? {
                totalRecords: studentsQuery.data.total_records,
                totalPages: studentsQuery.data.total_pages,
                sortBy: studentsQuery.data.sort_by,
                sortOrder: studentsQuery.data.sort_order,
              }
            : undefined
        }
        onStateChange={setServerParams}
        onExportCsv={exportCsv}
        isExporting={isExporting}
      />
    </div>
  );
};
