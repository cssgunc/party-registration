"use client";

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
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountService.listAccounts(["admin", "staff"]),
    retry: 1,
  });

  const accounts = (accountsQuery.data ?? []).filter(
    (a) => a.role === "admin" || a.role === "staff"
  );

  const createMutation = useMutation({
    mutationFn: (data: AccountTableFormValues) =>
      accountService.createAccount({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        pid: data.pid,
        onyen: data.onyen,
        role: data.role as AccountRole,
      }),
    onError: (error: Error, variables) => {
      const errorMessage =
        isAxiosError(error) && error.response
          ? `${error.response.data.message}`
          : `Failed to create account: ${error.message}`;

      if (isAxiosError(error) && error.response) {
        console.error("Failed to create account:", error.response.data);
      } else {
        console.error("Failed to create account:", error);
      }

      openSidebar(
        "create-account",
        "New Account",
        "Add a new account to the system",
        <AccountTableForm
          title="New Account"
          onSubmit={handleCreateSubmit}
          submissionError={errorMessage}
          editData={variables}
        />
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeSidebar();
      setEditingAccount(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountTableFormValues }) =>
      accountService.updateAccount(id, {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        pid: data.pid,
        onyen: data.onyen,
        role: data.role as AccountRole,
      }),
    onError: (error: Error, variables) => {
      console.error("Failed to update account:", error);
      const errorMessage = `Failed to update account: ${error.message}`;
      const editTarget =
        editingAccount && editingAccount.id === variables.id
          ? editingAccount
          : null;

      const editData = editTarget
        ? {
            email: editTarget.email,
            first_name: editTarget.first_name,
            last_name: editTarget.last_name,
            pid: editTarget.pid ?? "",
            onyen: editTarget.onyen ?? "",
            role: editTarget.role,
          }
        : variables.data;

      openSidebar(
        `edit-account-${variables.id}`,
        "Edit Account",
        "Update account information",
        <AccountTableForm
          title="Edit Account"
          onSubmit={(data) => handleEditSubmit(variables.id, data)}
          submissionError={errorMessage}
          editData={editData}
        />
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeSidebar();
      setEditingAccount(null);
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
    openSidebar(
      `edit-account-${account.id}`,
      "Edit Account",
      "Update account information",
      <AccountTableForm
        title="Edit Account"
        onSubmit={(data) => handleEditSubmit(account.id, data)}
        editData={{
          email: account.email,
          first_name: account.first_name,
          last_name: account.last_name,
          pid: account.pid ?? "",
          onyen: account.onyen ?? "",
          role: account.role,
        }}
      />
    );
  };

  const handleDelete = (account: AccountDto) => {
    deleteMutation.mutate(account.id);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    openSidebar(
      "create-account",
      "New Account",
      "Add a new account to the system",
      <AccountTableForm title="New Account" onSubmit={handleCreateSubmit} />
    );
  };

  const handleCreateSubmit = async (data: AccountTableFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = async (
    accountId: number,
    data: AccountTableFormValues
  ) => {
    updateMutation.mutate({ id: accountId, data });
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
      accessorKey: "onyen",
      header: "Onyen",
      enableColumnFilter: true,
    },
    {
      accessorKey: "role",
      header: "Admin Type",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return role.charAt(0).toUpperCase() + role.slice(1);
      },
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
        sortBy={(a, b) =>
          a.last_name.localeCompare(b.last_name) ||
          a.first_name.localeCompare(b.first_name)
        }
      />
    </div>
  );
};
