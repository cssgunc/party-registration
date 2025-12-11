"use client";

import { AccountService } from "@/lib/api/account/account.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import * as z from "zod";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import AccountTableCreateEditForm, {
  AccountCreateEditValues as AccountCreateEditSchema,
} from "./AccountTableCreateEdit";

import type { Account, AccountRole } from "@/lib/api/account/account.service";
import { isAxiosError } from "axios";

type AccountCreateEditValues = z.infer<typeof AccountCreateEditSchema>;

const accountService = new AccountService();

export const AccountTable = () => {
  const queryClient = useQueryClient();
  const { openSidebar, closeSidebar } = useSidebar();
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
    );

  const createMutation = useMutation({
    mutationFn: (data: AccountCreateEditValues) =>
      accountService.createAccount({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
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
    mutationFn: ({ id, data }: { id: number; data: AccountCreateEditValues }) =>
      accountService.updateAccount(id, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
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

      const previous = queryClient.getQueryData<Account[]>(["accounts"]);

      queryClient.setQueryData<Account[] | undefined>(["accounts"], (old) =>
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

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setSidebarMode("edit");
    setSubmissionError(null);
    openSidebar(
      `edit-account-${account.id}`,
      "Edit Account",
      "Update account information",
      <AccountTableCreateEditForm
        title="Edit Account"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
        editData={{
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          role: account.role,
          pid: account.pid ?? "",
        }}
      />
    );
  };

  const handleDelete = (account: Account) => {
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
      <AccountTableCreateEditForm
        title="New Account"
        onSubmit={handleFormSubmit}
        submissionError={submissionError}
      />
    );
  };

  const handleFormSubmit = async (data: AccountCreateEditValues) => {
    if (sidebarMode === "edit" && editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else if (sidebarMode === "create") {
      createMutation.mutate(data);
    }
  };

  const columns: ColumnDef<Account>[] = [
    {
      accessorKey: "email",
      header: "Email",
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
        getDeleteDescription={(account: Account) =>
          `Are you sure you want to delete account ${account.email}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
