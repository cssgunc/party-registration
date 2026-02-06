"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountService } from "@/lib/api/account/account.service";
import { AdminStudentService } from "@/lib/api/student/admin-student.service";
import { StudentDto } from "@/lib/api/student/student.types";
import { PaginatedResponse } from "@/lib/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { TableTemplate } from "../shared/table/TableTemplate";
import StudentTableForm from "./StudentTableForm";

const studentService = new AdminStudentService();
const accountService = new AccountService();

export const StudentTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Fetch students
  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => studentService.listStudents(),
    retry: 1, // Only retry once
  });

  const students = studentsQuery.data?.items ?? [];

  // Update student mutation (for checkbox and edit)
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Omit<StudentDto, "id" | "email" | "pid">;
    }) => studentService.updateStudent(id, data),
    // Optimistically update the student in the cache so things like the
    // "Is Registered" checkbox feel instant.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });

      const previous = queryClient.getQueryData<PaginatedResponse<StudentDto>>([
        "students",
      ]);

      queryClient.setQueryData<PaginatedResponse<StudentDto>>(
        ["students"],
        (old) =>
          old && {
            ...old,
            items: old.items.map((student) =>
              student.id === id ? { ...student, ...data } : student
            ),
          }
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      console.error("Failed to update student:", error);
      setSubmissionError(`Failed to update student: ${error.message}`);
      if (context?.previous) {
        queryClient.setQueryData(["students"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      closeSidebar();
      setEditingStudent(null);
      setSubmissionError(null);
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async ({ data }: { data: Omit<StudentDto, "id"> }) => {
      const account = await accountService.createAccount({
        role: "student",
        ...data,
      });

      studentService.createStudent({
        account_id: account.id,
        data,
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create student:", error);
      setSubmissionError(`Failed to create student: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      closeSidebar();
      setEditingStudent(null);
      setSubmissionError(null);
    },
  });

  // Delete student mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentService.deleteStudent(id),
    // Optimistically remove the student from the cache.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });

      const previous = queryClient.getQueryData(["students"]);

      queryClient.setQueryData(["students"], (old: unknown) => {
        if (!old || typeof old !== "object") return old;

        const oldWithItems = old as { items?: StudentDto[] };
        if (Array.isArray(oldWithItems.items)) {
          const paginated = old as {
            items: StudentDto[];
            [key: string]: unknown;
          };
          return {
            ...paginated,
            items: paginated.items.filter((s) => s.id !== id),
          };
        }

        if (Array.isArray(old)) {
          return (old as StudentDto[]).filter((s) => s.id !== id);
        }

        return old;
      });

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      console.error("Failed to delete student:", error);
      if (context?.previous) {
        queryClient.setQueryData(["students"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  const handleEdit = (student: StudentDto) => {
    setEditingStudent(student);

    setSubmissionError(null);
    openSidebar(
      `edit-student-${student.id}`,
      "Edit Student",
      "Update student information",
      <StudentTableForm
        title="Edit Student"
        onSubmit={async (data) => {
          if (!editingStudent) return;
          await updateMutation.mutateAsync({
            id: editingStudent.id,
            data,
          });
        }}
        submissionError={submissionError}
        editData={student}
      />
    );
  };

  const handleDelete = (student: StudentDto) => {
    deleteMutation.mutate(student.id);
  };

  const handleCreate = () => {
    setEditingStudent(null);

    setSubmissionError(null);
    openSidebar(
      "create-student",
      "New Student",
      "Add a new student to the system",
      <StudentTableForm
        title="New Student"
        onSubmit={async (data) => {
          await createStudentMutation.mutateAsync({ data });
        }}
        submissionError={submissionError}
      />
    );
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
          ? `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(
              6,
              10
            )}`
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
        const isRegistered = !!student.last_registered;
        return (
          <Checkbox
            checked={isRegistered}
            onCheckedChange={(checked: boolean) => {
              updateMutation.mutate({
                id: student.id,
                data: {
                  ...student,
                  last_registered: checked ? new Date() : null,
                },
              });
            }}
            disabled={updateMutation.isPending}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Table */}
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
