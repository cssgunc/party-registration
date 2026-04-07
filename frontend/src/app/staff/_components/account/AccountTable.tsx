"use client";

import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/lib/api/account/account.queries";
import type {
  AccountData,
  AccountDto,
  AccountRole,
} from "@/lib/api/account/account.types";
import {
  DEFAULT_TABLE_PARAMS,
  ServerColumnMap,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useState } from "react";
import * as z from "zod";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import AccountTableForm, { accountTableFormSchema } from "./AccountTableForm";

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

const hasAccountChanged = (
  original: AccountDto | null,
  updated: AccountData
): boolean => {
  if (!original) return true;

  return (
    original.email !== updated.email ||
    original.first_name !== updated.first_name ||
    original.last_name !== updated.last_name ||
    original.pid !== updated.pid ||
    original.onyen !== updated.onyen ||
    original.role !== updated.role
  );
};

const SERVER_COLUMN_MAP: ServerColumnMap = {
  email: { backendField: "email", filterOperator: "contains" },
  first_name: { backendField: "first_name", filterOperator: "contains" },
  last_name: { backendField: "last_name", filterOperator: "contains" },
  onyen: { backendField: "onyen", filterOperator: "contains" },
  role: { backendField: "role", filterOperator: "eq" },
};

export const AccountTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const { openSnackbar } = useSnackbar();
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const accountsQuery = useAccounts(serverParams);
  const accounts = accountsQuery.data?.items ?? [];

  const createMutation = useCreateAccount({
    onError: (error: Error, variables: AccountData) => {
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
          editData={{
            email: variables.email,
            first_name: variables.first_name,
            last_name: variables.last_name,
            pid: variables.pid,
            onyen: variables.onyen,
            role: variables.role,
          }}
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      setEditingAccount(null);
      openSnackbar("Student created successfully", "success");
    },
  });

  const updateMutation = useUpdateAccount({
    onError: (error: Error, variables: { id: number; data: AccountData }) => {
      console.error("Failed to update account:", error);
      const errorMessage = `${error.message}` || "Failed to update account";
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
    onSuccess: (data, variables) => {
      if (hasAccountChanged(editingAccount, variables.data)) {
        openSnackbar("Account edited successfully", "success");
      }
      closeSidebar();
      setEditingAccount(null);
    },
  });

  const deleteMutation = useDeleteAccount({
    onSuccess: () => {
      openSnackbar("Account deleted successfully", "success");
    },
    onError: (error: Error) => {
      console.error("Failed to delete account:", error);
      openSnackbar("Failed to delete account", "error");
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
    createMutation.mutate({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      pid: data.pid,
      onyen: data.onyen,
      role: data.role as AccountRole,
    });
  };

  const handleEditSubmit = async (
    accountId: number,
    data: AccountTableFormValues
  ) => {
    updateMutation.mutate({
      id: accountId,
      data: {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        pid: data.pid,
        onyen: data.onyen,
        role: data.role as AccountRole,
      },
    });
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
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={accounts}
        columns={columns}
        resourceName="Account"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={accountsQuery.isLoading}
        isFetching={accountsQuery.isFetching}
        error={accountsQuery.error as Error | null}
        getDeleteDescription={(account: AccountDto) =>
          `Are you sure you want to delete account ${account.email}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        serverMeta={
          accountsQuery.data
            ? {
                totalRecords: accountsQuery.data.total_records,
                totalPages: accountsQuery.data.total_pages,
              }
            : undefined
        }
        onStateChange={setServerParams}
        columnMap={SERVER_COLUMN_MAP}
      />
    </div>
  );
};
