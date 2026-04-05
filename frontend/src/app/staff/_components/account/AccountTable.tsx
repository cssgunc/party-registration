"use client";

import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useDeletePoliceAccount,
  usePoliceAccounts,
  useUpdateAccount,
  useUpdatePoliceAccount,
} from "@/lib/api/account/account.queries";
import type {
  AccountData,
  AccountRole,
  AccountTableRow,
} from "@/lib/api/account/account.types";
import type { PoliceAccountUpdate } from "@/lib/api/police/police.types";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import * as z from "zod";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import AccountTableForm, { accountTableFormSchema } from "./AccountTableForm";
import PoliceAccountForm, {
  type PoliceAccountFormValues,
} from "./PoliceAccountForm";

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

export const AccountTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const [editingAccount, setEditingAccount] = useState<AccountTableRow | null>(
    null
  );

  const accountsQuery = useAccounts();
  const policeAccountsQuery = usePoliceAccounts();

  const tableRows: AccountTableRow[] = useMemo(() => {
    const regularAccounts: AccountTableRow[] = (accountsQuery.data ?? [])
      .filter((a) => a.role === "admin" || a.role === "staff")
      .map((a) => ({ ...a, _isPolice: false }));

    const policeRows: AccountTableRow[] = (policeAccountsQuery.data ?? []).map(
      (p) => ({
        id: p.id,
        email: p.email,
        first_name: "-",
        last_name: "-",
        pid: "-",
        onyen: "-",
        role: "police" as const,
        _isPolice: true,
      })
    );

    return [...regularAccounts, ...policeRows];
  }, [accountsQuery.data, policeAccountsQuery.data]);

  const createAccountMutation = useCreateAccount({
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
          onSubmit={handleAccountCreateSubmit}
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

  const updateAccountMutation = useUpdateAccount({
    onError: (error: Error, variables: { id: number; data: AccountData }) => {
      console.error("Failed to update account:", error);
      const errorMessage = `Failed to update account: ${error.message}`;
      const editTarget =
        editingAccount &&
        !editingAccount._isPolice &&
        editingAccount.id === variables.id
          ? editingAccount
          : null;

      const editData = editTarget
        ? {
            email: editTarget.email,
            first_name: editTarget.first_name,
            last_name: editTarget.last_name,
            pid: editTarget.pid ?? "",
            onyen: editTarget.onyen ?? "",
            role: editTarget.role as AccountRole,
          }
        : variables.data;

      openSidebar(
        `edit-account-${variables.id}`,
        "Edit Account",
        "Update account information",
        <AccountTableForm
          title="Edit Account"
          onSubmit={(data) => handleAccountEditSubmit(variables.id, data)}
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

  const updatePoliceAccountMutation = useUpdatePoliceAccount({
    onError: (
      error: Error,
      variables: { id: number; data: PoliceAccountUpdate }
    ) => {
      console.error("Failed to update police account:", error);
      const errorMessage = `Failed to update police account: ${error.message}`;

      openSidebar(
        `edit-police-${variables.id}`,
        "Edit Police Account",
        "Update police account credentials",
        <PoliceAccountForm
          title="Edit Police Account"
          onSubmit={(data) => handlePoliceEditSubmit(variables.id, data)}
          submissionError={errorMessage}
          editData={{ email: variables.data.email }}
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      setEditingAccount(null);
    },
  });

  const deleteAccountMutation = useDeleteAccount({
    onError: (error: Error) => {
      console.error("Failed to delete account:", error);
    },
  });

  const deletePoliceAccountMutation = useDeletePoliceAccount({
    onError: (error: Error) => {
      console.error("Failed to delete police account:", error);
    },
  });

  const handleEdit = (row: AccountTableRow) => {
    setEditingAccount(row);

    if (row._isPolice) {
      openSidebar(
        `edit-police-${row.id}`,
        "Edit Police Account",
        "Update police account credentials",
        <PoliceAccountForm
          title="Edit Police Account"
          onSubmit={(data) => handlePoliceEditSubmit(row.id, data)}
          editData={{ email: row.email }}
        />
      );
    } else {
      openSidebar(
        `edit-account-${row.id}`,
        "Edit Account",
        "Update account information",
        <AccountTableForm
          title="Edit Account"
          onSubmit={(data) => handleAccountEditSubmit(row.id, data)}
          editData={{
            email: row.email,
            first_name: row.first_name,
            last_name: row.last_name,
            pid: row.pid ?? "",
            onyen: row.onyen ?? "",
            role: row.role as AccountRole,
          }}
        />
      );
    }
  };

  const handleDelete = (row: AccountTableRow) => {
    if (row._isPolice) {
      deletePoliceAccountMutation.mutate(row.id);
    } else {
      deleteAccountMutation.mutate(row.id);
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    openSidebar(
      "create-account",
      "New Account",
      "Add a new account to the system",
      <AccountTableForm
        title="New Account"
        onSubmit={handleAccountCreateSubmit}
      />
    );
  };

  const handleAccountCreateSubmit = async (data: AccountTableFormValues) => {
    createAccountMutation.mutate({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      pid: data.pid,
      onyen: data.onyen,
      role: data.role as AccountRole,
    });
  };

  const handleAccountEditSubmit = async (
    accountId: number,
    data: AccountTableFormValues
  ) => {
    updateAccountMutation.mutate({
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

  const handlePoliceEditSubmit = async (
    policeId: number,
    data: PoliceAccountFormValues
  ) => {
    updatePoliceAccountMutation.mutate({
      id: policeId,
      data: {
        email: data.email,
        password: data.password,
      },
    });
  };

  const columns: ColumnDef<AccountTableRow>[] = [
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
      accessorKey: "pid",
      header: "PID",
      enableColumnFilter: true,
    },
    {
      accessorKey: "role",
      header: "Role",
      enableColumnFilter: true,
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return role.charAt(0).toUpperCase() + role.slice(1);
      },
    },
  ];

  const isLoading = accountsQuery.isLoading || policeAccountsQuery.isLoading;
  const queryError =
    (accountsQuery.error as Error | null) ??
    (policeAccountsQuery.error as Error | null);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={tableRows}
        columns={columns}
        resourceName="Account"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={isLoading}
        error={queryError}
        getDeleteDescription={(row: AccountTableRow) =>
          `Are you sure you want to delete ${row._isPolice ? "police " : ""}account ${row.email}? This action cannot be undone.`
        }
        isDeleting={
          deleteAccountMutation.isPending ||
          deletePoliceAccountMutation.isPending
        }
        sortBy={(a, b) =>
          a.role.localeCompare(b.role) ||
          a.last_name.localeCompare(b.last_name) ||
          a.first_name.localeCompare(b.first_name)
        }
      />
    </div>
  );
};
