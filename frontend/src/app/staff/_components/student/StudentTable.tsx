"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_TABLE_PARAMS,
  ServerColumnMap,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import {
  useCreateStudent,
  useDeleteStudent,
  useStudents,
  useUpdateStudent,
} from "@/lib/api/student/admin-student.queries";
import { StudentDto, StudentUpdateDto } from "@/lib/api/student/student.types";
import { isFromThisSchoolYear } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import LocationInfoChipDetails from "../party/details/LocationInfoChipDetails";
import { GenericInfoChip } from "../shared/sidebar/GenericInfoChip";
import { TableTemplate } from "../shared/table/TableTemplate";
import StudentTableForm from "./StudentTableForm";

const toEditData = (student: StudentDto) => ({
  ...student,
  residence_place_id: student.residence?.location.google_place_id ?? null,
});

const SERVER_COLUMN_MAP: ServerColumnMap = {
  onyen: { backendField: "onyen", filterOperator: "contains" },
  pid: { backendField: "pid", filterOperator: "contains" },
  first_name: { backendField: "first_name", filterOperator: "contains" },
  last_name: { backendField: "last_name", filterOperator: "contains" },
  email: { backendField: "email", filterOperator: "contains" },
  phone_number: { backendField: "phone_number", filterOperator: "contains" },
  contact_preference: {
    backendField: "contact_preference",
    filterOperator: "eq",
  },
};

export const StudentTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const studentsQuery = useStudents(serverParams);
  const students = studentsQuery.data?.items ?? [];

  const checkboxMutation = useUpdateStudent();

  const editFormMutation = useUpdateStudent({
    onOptimisticUpdate: () => {
      closeSidebar();
      setEditingStudent(null);
    },
    onError: (error) => {
      console.error("Failed to update student:", error);
      if (!editingStudent) return;
      openSidebar(
        `edit-student-${editingStudent.id}`,
        "Edit Student",
        "Update student information",
        <StudentTableForm
          title="Edit Student"
          onSubmit={(data) => handleEditSubmit(editingStudent, data)}
          submissionError={`Failed to update student: ${error.message}`}
          editData={editingStudent}
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      setEditingStudent(null);
    },
  });

  const createMutation = useCreateStudent({
    onError: (error, vars) => {
      console.error("Failed to create student:", error);
      openSidebar(
        "create-student",
        "New Student",
        "Add a new student to the system",
        <StudentTableForm
          title="New Student"
          onSubmit={handleCreateSubmit}
          submissionError={`Failed to create student: ${error.message}`}
          editData={vars.data}
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      setEditingStudent(null);
    },
  });

  const deleteMutation = useDeleteStudent({
    onError: (error) => {
      console.error("Failed to delete student:", error);
    },
  });

  const handleEdit = (student: StudentDto) => {
    setEditingStudent(student);
    openSidebar(
      `edit-student-${student.id}`,
      "Edit Student",
      "Update student information",
      <StudentTableForm
        title="Edit Student"
        onSubmit={(data) => handleEditSubmit(student, data)}
        editData={toEditData(student)}
      />
    );
  };

  const handleDelete = (student: StudentDto) => {
    deleteMutation.mutate(student.id);
  };

  const handleCreate = () => {
    setEditingStudent(null);
    openSidebar(
      "create-student",
      "New Student",
      "Add a new student to the system",
      <StudentTableForm title="New Student" onSubmit={handleCreateSubmit} />
    );
  };

  const handleCreateSubmit = async (data: Omit<StudentDto, "id">) => {
    createMutation.mutate({ data });
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
    },
    {
      accessorKey: "pid",
      header: "PID",
      enableColumnFilter: true,
    },
    {
      accessorKey: "first_name",
      header: "First Name",
      enableColumnFilter: true,
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableColumnFilter: true,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableColumnFilter: true,
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
    },
    {
      accessorKey: "contact_preference",
      header: "Call/Text",
      enableColumnFilter: true,
      meta: {
        filterType: "select",
        selectOptions: ["call", "text"],
      },
      cell: ({ row }) => {
        const preference =
          row.getValue<StudentDto["contact_preference"]>("contact_preference");
        return preference === "call" ? "Call" : "Text";
      },
    },
    {
      id: "residence",
      header: "Residence",
      enableColumnFilter: false,
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
          <GenericInfoChip
            chipKey={`student-${student.id}-residence`}
            title="Residence Information"
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
      enableColumnFilter: false,
      cell: ({ row }) => {
        const student = row.original;
        const isRegistered = isFromThisSchoolYear(student.last_registered);
        return (
          <Checkbox
            checked={isRegistered}
            onCheckedChange={(checked: boolean) => {
              checkboxMutation.mutate({
                id: student.id,
                data: {
                  ...student,
                  last_registered: checked ? new Date() : null,
                },
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
        onCreateNewRow={handleCreate}
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
              }
            : undefined
        }
        onStateChange={setServerParams}
        columnMap={SERVER_COLUMN_MAP}
      />
    </div>
  );
};
