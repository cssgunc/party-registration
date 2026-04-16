"use client";

import { useSnackbar } from "@/contexts/SnackbarContext";
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
import type {
  PoliceAccountUpdate,
  PoliceRole,
} from "@/lib/api/police/police.types";
import {
  DEFAULT_TABLE_PARAMS,
  ServerColumnMap,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { formatRoleLabel } from "@/lib/utils";
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

const hasAccountChanged = (
  original: AccountTableRow | null,
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

const getErrorMessage = (error: Error): string => {
  if (isAxiosError(error)) {
    const detail = error.response?.data as {
      message?: string;
      detail?: string;
    };
    switch (error.response?.status) {
      case 404:
        return "Account not found.";
      case 403:
        return "You do not have permission to perform this action.";
      case 500:
        return "Server error. Please try again later.";
    }
    if (detail?.message) return String(detail.message);
    if (detail?.detail) return String(detail.detail);
    if (error.message) return error.message;
  }
  return "Operation failed";
};

export const AccountTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const { openSnackbar } = useSnackbar();
  const [editingAccount, setEditingAccount] = useState<AccountTableRow | null>(
    null
  );
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const accountsQuery = useAccounts(serverParams);
  const policeAccountsQuery = usePoliceAccounts();

  const tableRows: AccountTableRow[] = useMemo(() => {
    const regularAccounts: AccountTableRow[] = (accountsQuery.data?.items ?? [])
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
        role: p.role,
        _isPolice: true,
      })
    );

    return [...regularAccounts, ...policeRows];
  }, [accountsQuery.data, policeAccountsQuery.data]);

  const createAccountMutation = useCreateAccount({
    onError: (error: Error, variables: AccountData) => {
      const message = getErrorMessage(error);

      openSidebar(
        "create-account",
        "New Account",
        "Add a new account to the system",
        <AccountTableForm
          title="New Account"
          onSubmit={handleAccountCreateSubmit}
          submissionError={message}
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
      openSnackbar("Account created successfully", "success");
    },
  });

  const updateAccountMutation = useUpdateAccount({
    onError: (error: Error, variables: { id: number; data: AccountData }) => {
      const message = getErrorMessage(error);
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
          submissionError={message}
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
          editData={{ email: variables.data.email, role: variables.data.role }}
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
      const message = getErrorMessage(error);
      console.error("Failed to delete account:", message);
      openSnackbar("Failed to delete account", "error");
    },
  });

  const deletePoliceAccountMutation = useDeletePoliceAccount({
    onError: (error: Error) => {
      console.error("Failed to delete police account:", error);
      openSnackbar("Failed to delete police account", "error");
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
          editData={{ email: row.email, role: row.role as PoliceRole }}
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
        role: data.role as PoliceRole,
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
        const role = row.getValue("role") as AccountTableRow["role"];
        return formatRoleLabel(role);
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
        isFetching={accountsQuery.isFetching}
        error={queryError}
        getDeleteDescription={(row: AccountTableRow) =>
          `Are you sure you want to delete ${row._isPolice ? "police " : ""}account ${row.email}? This action cannot be undone.`
        }
        isDeleting={
          deleteAccountMutation.isPending ||
          deletePoliceAccountMutation.isPending
        }
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
