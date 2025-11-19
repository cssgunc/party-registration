"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountService } from "@/services/accountService";
import { StudentService } from "@/services/studentService";
import { Student } from "@/types/api/student";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import StudentTableCreateEditForm from "./StudentTableCreateEdit";
import { TableTemplate } from "./TableTemplate";

const studentService = new StudentService();
const accountService = new AccountService();

export const StudentTable = () => {
    const queryClient = useQueryClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Fetch students
    const studentsQuery = useQuery({
        queryKey: ["students"],
        queryFn: () => studentService.listStudents(),
        retry: 1, // Only retry once
    });
    const students = (studentsQuery.data?.items ?? []).slice().sort(
        (a, b) =>
            a.lastName.localeCompare(b.lastName) ||
            a.firstName.localeCompare(b.firstName)
    );

    // Update student mutation (for checkbox and edit)
    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: {
                firstName: string;
                lastName: string;
                phoneNumber: string;
                contactPreference: "call" | "text";
                lastRegistered: Date | null;
            };
        }) => studentService.updateStudent(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            setSidebarOpen(false);
            setEditingStudent(null);
        },
        onError: (error: Error) => {
            console.error("Failed to update student:", error);
        },
    });

    // Create account mutation
    const createAccountMutation = useMutation({
        mutationFn: (data: {
            email: string;
            firstName: string;
            lastName: string;
            pid: string;
        }) =>
            accountService.createAccount({
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                pid: data.pid,
                role: "student",
            }),
        onError: (error: Error) => {
            console.error("Failed to create account:", error);
        },
    });

    // Create student mutation
    const createStudentMutation = useMutation({
        mutationFn: ({
            accountId,
            data,
        }: {
            accountId: number;
            data: {
                firstName: string;
                lastName: string;
                phoneNumber: string;
                contactPreference: "call" | "text";
                lastRegistered: Date | null;
            };
        }) =>
            studentService.createStudent({
                account_id: accountId,
                data: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    phone_number: data.phoneNumber,
                    contact_preference: data.contactPreference,
                    last_registered: data.lastRegistered
                        ? data.lastRegistered.toISOString()
                        : null,
                },
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            setSidebarOpen(false);
            setEditingStudent(null);
        },
        onError: (error: Error) => {
            console.error("Failed to create student:", error);
        },
    });

    // Delete student mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => studentService.deleteStudent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
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
        deleteMutation.mutate(student.id);
    };

    const handleCreate = () => {
        setEditingStudent(null);
        setSidebarMode("create");
        setSidebarOpen(true);
    };

    const handleFormSubmit = async (data: {
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
        } else if (sidebarMode === "create") {
            // First create account, then create student with that account_id
            try {
                const account = await createAccountMutation.mutateAsync({
                    email: `${data.pid}@unc.edu`, // Generate email from PID
                    firstName: data.firstName,
                    lastName: data.lastName,
                    pid: data.pid,
                });

                // Then create student with the new account ID
                createStudentMutation.mutate({
                    accountId: account.id,
                    data: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phoneNumber: data.phoneNumber,
                        contactPreference: data.contactPreference,
                        lastRegistered: data.lastRegistered,
                    },
                });
            } catch (error) {
                console.error("Failed to create student:", error);
            }
        }
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
                                    firstName: student.firstName,
                                    lastName: student.lastName,
                                    phoneNumber: student.phoneNumber,
                                    contactPreference: student.contactPreference,
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
        </div>
    );
};
