"use client";

import { useSidebar } from "@/components/SidebarContext";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountService } from "@/services/accountService";
import { AdminStudentService } from "@/services/adminStudentService";
import { PaginatedStudentsResponse, Student } from "@/types/api/student";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import StudentTableCreateEditForm from "./StudentTableCreateEdit";
import { TableTemplate } from "./TableTemplate";

const studentService = new AdminStudentService();
const accountService = new AccountService();

export const StudentTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Fetch students
  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => studentService.listStudents(),
    retry: 1, // Only retry once
  });

  const students = useMemo(
    () =>
      (studentsQuery.data?.items ?? [])
        .slice()
        .sort(
          (a, b) =>
            a.lastName.localeCompare(b.lastName) ||
            a.firstName.localeCompare(b.firstName)
        ),
    [studentsQuery.data?.items]
  );

  // Update student mutation (for checkbox and edit)
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Omit<Student, "id" | "email" | "pid">;
    }) => studentService.updateStudent(id, data),
    // Optimistically update the student in the cache so things like the
    // "Is Registered" checkbox feel instant.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });

      const previous = queryClient.getQueryData<PaginatedStudentsResponse>([
        "students",
      ]);

      queryClient.setQueryData<PaginatedStudentsResponse>(
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
    mutationFn: async ({ data }: { data: Omit<Student, "id"> }) => {
      const account = await accountService.createAccount({
        role: "student",
        ...data,
      });

      studentService.createStudent({
        account_id: account.id,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          contact_preference: data.contactPreference,
          last_registered: data.lastRegistered
            ? data.lastRegistered.toISOString()
            : null,
        },
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

        const oldWithItems = old as { items?: Student[] };
        if (Array.isArray(oldWithItems.items)) {
          const paginated = old as {
            items: Student[];
            [key: string]: unknown;
          };
          return {
            ...paginated,
            items: paginated.items.filter((s) => s.id !== id),
          };
        }

        if (Array.isArray(old)) {
          return (old as Student[]).filter((s) => s.id !== id);
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

  const handleEdit = (student: Student) => {
    setEditingStudent(student);

    setSubmissionError(null);
    openSidebar(
      `edit-student-${student.id}`,
      "Edit Student",
      "Update student information",
      <StudentTableCreateEditForm
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

  const handleDelete = (student: Student) => {
    deleteMutation.mutate(student.id);
  };

  const handleCreate = () => {
    setEditingStudent(null);

    setSubmissionError(null);
    openSidebar(
      "create-student",
      "New Student",
      "Add a new student to the system",
      <StudentTableCreateEditForm
        title="New Student"
        onSubmit={async (data) => {
          await createStudentMutation.mutateAsync({ data });
        }}
        submissionError={submissionError}
      />
    );
  };

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
      cell: ({ row }) => {
        const preference =
          row.getValue<Student["contactPreference"]>("contactPreference");
        return preference === "call" ? "Call" : "Text";
      },
    },
    {
      accessorKey: "lastRegistered",
      header: "Is Registered",
      enableColumnFilter: false,
      cell: ({ row }) => {
        const student = row.original;
        const isRegistered = !!student.lastRegistered;
        return (
          <Checkbox
            checked={isRegistered}
            onCheckedChange={(checked: boolean) => {
              updateMutation.mutate({
                id: student.id,
                data: {
                  ...student,
                  lastRegistered: checked ? new Date() : null,
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
        getDeleteDescription={(student: Student) =>
          `Are you sure you want to delete ${student.firstName} ${student.lastName}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
