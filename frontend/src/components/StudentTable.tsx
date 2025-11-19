"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StudentService } from "@/services/studentService";
import { Student } from "@/types/api/student";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import StudentTableCreateEditForm from "./StudentTableCreateEdit";
import { TableTemplate } from "./TableTemplate";

const studentService = new StudentService();

export const StudentTable = () => {
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Fetch students
    const studentsQuery = useQuery({
        queryKey: ["students"],
        queryFn: () => studentService.listStudents(),
        retry: 1, // Only retry once
    });

    // Update student mutation (for checkbox and edit)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Student> }) =>
            studentService.updateStudent(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            setSidebarOpen(false);
            setEditingStudent(null);
        },
        onError: (error: Error) => {
            console.error("Failed to update student:", error);
        },
    });

    // Delete student mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => studentService.deleteStudent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            setDeleteDialogOpen(false);
            setStudentToDelete(null);
        },
        onError: (error: Error) => {
            console.error("Failed to delete student:", error);
        },
    });

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setSidebarMode("edit");
        setSidebarOpen(true);
    };

    const handleDelete = (student: Student) => {
        setStudentToDelete(student);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (studentToDelete) {
            deleteMutation.mutate(studentToDelete.id);
        }
    };

    const handleCreate = () => {
        setEditingStudent(null);
        setSidebarMode("create");
        setSidebarOpen(true);
    };

    const handleFormSubmit = (data: {
        pid: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
        contactPreference: "call" | "text";
        lastRegistered: Date | null;
    }) => {
        if (sidebarMode === "edit" && editingStudent) {
            updateMutation.mutate({
                id: editingStudent.id,
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phoneNumber: data.phoneNumber,
                    contactPreference: data.contactPreference,
                    lastRegistered: data.lastRegistered,
                },
            });
        }
        // Note: Create functionality will need account_id, which requires additional work
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
                    ? `(${number.slice(0, 3)}) ${number.slice(
                          3,
                          6
                      )}-${number.slice(6, 10)}`
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
            {/* New Student Button */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Students</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Student
                </Button>
            </div>

            {/* Table */}
            <TableTemplate
                data={studentsQuery.data?.items ?? []}
                columns={columns}
                details="Student table"
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={studentsQuery.isLoading}
                error={studentsQuery.error}
            />

            {/* Sidebar for Create/Edit */}
            {sidebarOpen && (
                <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-6 overflow-y-auto z-50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            {sidebarMode === "create" ? "New Student" : "Edit Student"}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarOpen(false)}
                        >
                            ✕
                        </Button>
                    </div>
                    <StudentTableCreateEditForm
                        onSubmit={handleFormSubmit}
                        editData={
                            editingStudent
                                ? {
                                      pid: editingStudent.pid,
                                      firstName: editingStudent.firstName,
                                      lastName: editingStudent.lastName,
                                      phoneNumber: editingStudent.phoneNumber,
                                      contactPreference: editingStudent.contactPreference,
                                      lastRegistered: editingStudent.lastRegistered,
                                  }
                                : undefined
                        }
                    />
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title="Delete Student"
                description={`Are you sure you want to delete ${studentToDelete?.firstName} ${studentToDelete?.lastName}? This action cannot be undone.`}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
};
