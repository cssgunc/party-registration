"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useCreateStudent,
  useDeleteStudent,
  useStudents,
  useUpdateStudent,
} from "@/lib/api/student/admin-student.queries";
import { StudentDto } from "@/lib/api/student/student.types";
import { isFromThisSchoolYear } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { TableTemplate } from "../shared/table/TableTemplate";
import StudentTableForm from "./StudentTableForm";

const hasStudentChanged = (
  original: StudentDto | null,
  updated: Omit<StudentDto, "id" | "email" | "pid">
): boolean => {
  if (!original) return true;

  return (
    original.first_name !== updated.first_name ||
    original.last_name !== updated.last_name ||
    original.onyen !== updated.onyen ||
    original.phone_number !== updated.phone_number ||
    original.contact_preference !== updated.contact_preference ||
    original.last_registered?.getTime() !== updated.last_registered?.getTime()
  );
};

export const StudentTable = () => {
  const { openSnackbar } = useSnackbar();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);

  const studentsQuery = useStudents();
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
    onSuccess: (data, variables) => {
      if (hasStudentChanged(editingStudent, variables.data)) {
        openSnackbar("Student updated successfully", "success");
      }
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
      openSnackbar("Student created successfully", "success");
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
        title="Edit Student"
        onSubmit={(data) => handleEditSubmit(student, data)}
        editData={student}
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
    data: Omit<StudentDto, "id" | "email" | "pid">
  ) => {
    editFormMutation.mutate({ id: student.id, data });
  };

  const columns: ColumnDef<StudentDto>[] = [
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
      accessorKey: "onyen",
      header: "Onyen",
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
      header: "Contact Preference",
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
    <div className="space-y-4">
      <TableTemplate
        data={students}
        columns={columns}
        resourceName="Student"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreate}
        isLoading={studentsQuery.isLoading}
        error={studentsQuery.error}
        getDeleteDescription={(student: StudentDto) =>
          `Are you sure you want to delete ${student.first_name} ${student.last_name}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        sortBy={(a, b) =>
          a.last_name.localeCompare(b.last_name) ||
          a.first_name.localeCompare(b.first_name)
        }
      />
    </div>
  );
};
