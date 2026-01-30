"use client";

import { useRole } from "@/contexts/RoleContext";
import { AccountService } from "@/lib/api/account/account.service";
import type { AccountDto, AccountRole } from "@/lib/api/account/account.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useState } from "react";
import * as z from "zod";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import AccountTableForm, { accountTableFormSchema } from "./AccountTableForm";

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

const accountService = new AccountService();

export const AccountTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const { role } = useRole();

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.listAccounts(["admin", "staff"]),
    retry: 1,
  });

  const accounts = (accountsQuery.data ?? [])
    .filter((a) => a.role === "admin" || a.role === "staff")
    .slice()
    .sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name) ||
        a.first_name.localeCompare(b.first_name)
    );

  const createMutation = useMutation({
    mutationFn: (data: AccountTableFormValues) =>
      accountService.createAccount({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        pid: data.pid,
        role: data.role as AccountRole,
      }),
    onError: (error: Error) => {
      if (isAxiosError(error) && error.response) {
        setSubmissionError(`${error.response.data.message}`);
      } else {
        setSubmissionError(`Failed to create account: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeSidebar();
      setEditingAccount(null);
      setSubmissionError(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountTableFormValues }) =>
      accountService.updateAccount(id, {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        pid: data.pid,
        role: data.role as AccountRole,
      }),
    onError: (error: Error) => {
      console.error("Failed to update account:", error);
      setSubmissionError(`Failed to update account: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeSidebar();
      setEditingAccount(null);
      setSubmissionError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountService.deleteAccount(id),
    // Optimistically remove the account from the cache.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });

      const previous = queryClient.getQueryData<AccountDto[]>(["accounts"]);

      queryClient.setQueryData<AccountDto[] | undefined>(["accounts"], (old) =>
        old?.filter((a) => a.id !== id)
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      console.error("Failed to delete account:", error);
      if (context?.previous) {
        queryClient.setQueryData(["accounts"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const handleEdit = (account: AccountDto) => {
    setEditingAccount(account);
    setSidebarMode("edit");
    setSubmissionError(null);
    openSidebar(
      `edit-account-${account.id}`,
      "Edit Account",
      "Update account information",
      <AccountTableForm
        title="Edit Account"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
        editData={{
          email: account.email,
          first_name: account.first_name,
          last_name: account.last_name,
          role: account.role,
          pid: account.pid ?? "",
        }}
      />
    );
  };

  const handleDelete = (account: AccountDto) => {
    deleteMutation.mutate(account.id);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setSidebarMode("create");
    setSubmissionError(null);
    openSidebar(
      "create-account",
      "New Account",
      "Add a new account to the system",
      <AccountTableForm
        title="New Account"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
      />
    );
  };

  const handleFormSubmit = async (data: AccountTableFormValues) => {
    if (sidebarMode === "edit" && editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else if (sidebarMode === "create") {
      createMutation.mutate(data);
    }
  };

  const columns: ColumnDef<AccountDto>[] = [
    {
      accessorKey: "email",
      header: "Email",
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
      accessorKey: "role",
      header: "Admin Type",
      enableColumnFilter: true,
    },
  ];

  return (
    <div className="space-y-4">
      <TableTemplate
        data={accounts}
        columns={columns}
        resourceName="Account"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={handleCreate}
        isLoading={accountsQuery.isLoading}
        error={accountsQuery.error as Error | null}
        getDeleteDescription={(account: AccountDto) =>
          `Are you sure you want to delete account ${account.email}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        showActions={role === "admin"}
        showCreateButton={role === "admin"}
      />
    </div>
  );
};
