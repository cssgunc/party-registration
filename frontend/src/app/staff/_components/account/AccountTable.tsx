"use client";

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
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";
import * as z from "zod";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import AccountTableForm, { accountTableFormSchema } from "./AccountTableForm";

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

export const AccountTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const { data: session } = useSession();
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);

  const accountsQuery = useAccounts();

  const accounts = (accountsQuery.data ?? []).filter(
    (a) => a.role === "admin" || a.role === "staff"
  );

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
    },
  });

  const updateMutation = useUpdateAccount({
    onError: (error: Error, variables: { id: number; data: AccountData }) => {
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
      closeSidebar();
      setEditingAccount(null);
    },
  });

  const deleteMutation = useDeleteAccount({
    onError: (error: Error) => {
      console.error("Failed to delete account:", error);
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
        error={accountsQuery.error as Error | null}
        getDeleteDescription={(account: AccountDto) =>
          `Are you sure you want to delete account ${account.email}? This action cannot be undone.`
        }
        isDeleting={deleteMutation.isPending}
        isDeleteDisabled={(account: AccountDto) =>
          account.id === Number(session?.id)
        }
        sortBy={(a, b) =>
          a.last_name.localeCompare(b.last_name) ||
          a.first_name.localeCompare(b.first_name)
        }
      />
    </div>
  );
};
