"use client";

import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useAggregateAccounts,
  useCreateAccount,
  useDeleteAccount,
  useDeleteInvite,
  useDeletePoliceAccount,
  useDownloadAggregateAccountsCsv,
  useResendInvite,
  useUpdateAccount,
  useUpdatePoliceAccount,
} from "@/lib/api/account/account.queries";
import type {
  AccountRole,
  AccountUpdateData,
  AggregateAccountDto,
  CreateInviteDto,
  InviteTokenRole,
} from "@/lib/api/account/account.types";
import { ACCOUNT_ROLES } from "@/lib/api/account/account.types";
import type {
  PoliceAccountUpdate,
  PoliceRole,
} from "@/lib/api/police/police.types";
import {
  DEFAULT_TABLE_PARAMS,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { formatRoleLabel } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import * as z from "zod";
import { useSidebar } from "../shared/sidebar/SidebarContext";
import { TableTemplate } from "../shared/table/TableTemplate";
import AccountTableForm, { accountTableFormSchema } from "./AccountTableForm";
import PoliceAccountForm, {
  type PoliceAccountFormValues,
} from "./PoliceAccountForm";

type AccountTableFormValues = z.infer<typeof accountTableFormSchema>;

const isPoliceRow = (row: AggregateAccountDto) =>
  row.role === "officer" || row.role === "police_admin";

const ACCOUNT_ROLE_FILTER_OPTIONS = [
  ...ACCOUNT_ROLES,
  "officer",
  "police_admin",
] as const;

const ACCOUNT_STATUS_FILTER_OPTIONS = [
  "active",
  "unverified",
  "invited",
] as const;

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
    if (detail?.detail) return String(detail.detail);
    if (detail?.message) return String(detail.message);
    if (error.message) return error.message;
  }
  return "Operation failed";
};

export const AccountTable = () => {
  const { openSidebar, closeSidebar } = useSidebar();
  const { openSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const [editingRow, setEditingRow] = useState<AggregateAccountDto | null>(
    null
  );
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const aggregateQuery = useAggregateAccounts(serverParams);

  const { mutate: exportCsv, isPending: isExporting } =
    useDownloadAggregateAccountsCsv();

  const createAccountMutation = useCreateAccount({
    onError: (error: Error, variables: CreateInviteDto) => {
      const message = getErrorMessage(error);

      openSidebar(
        "create-account",
        "New Invite",
        "Send a staff or admin invitation",
        <AccountTableForm
          onSubmit={handleAccountCreateSubmit}
          submissionError={message}
          editData={{
            email: variables.email,
            role: variables.role,
          }}
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      setEditingRow(null);
      openSnackbar("Invite sent successfully", "success");
    },
  });

  const updateAccountMutation = useUpdateAccount({
    onError: (
      error: Error,
      variables: { id: number; data: AccountUpdateData }
    ) => {
      const message = getErrorMessage(error);

      openSidebar(
        `edit-account-${variables.id}`,
        "Edit Account",
        "Update account information",
        <AccountTableForm
          onSubmit={(data) => handleAccountEditSubmit(variables.id, data)}
          submissionError={message}
          editData={{
            email: editingRow?.email ?? "",
            role: (editingRow?.role ?? variables.data.role) as AccountRole,
          }}
        />
      );
    },
    onSuccess: () => {
      openSnackbar("Account edited successfully", "success");
      closeSidebar();
      setEditingRow(null);
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
          onSubmit={(data) => handlePoliceEditSubmit(variables.id, data)}
          submissionError={errorMessage}
          editData={{
            email: variables.data.email,
            role: variables.data.role,
            is_verified: variables.data.is_verified,
          }}
          disableVerificationToggle
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      setEditingRow(null);
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

  const deleteInviteMutation = useDeleteInvite({
    onError: (error: Error) => {
      const message = getErrorMessage(error);
      console.error("Failed to delete invite:", message);
      openSnackbar("Failed to delete invite", "error");
    },
  });

  const resendInviteMutation = useResendInvite({
    onError: (error: Error) => {
      const message = getErrorMessage(error);
      console.error("Failed to resend invite:", message);
      openSnackbar("Failed to resend invite", "error");
    },
    onSuccess: () => {
      openSnackbar("Invite resent successfully", "success");
    },
  });

  const handleEdit = (row: AggregateAccountDto) => {
    if (row.status === "invited") return;
    setEditingRow(row);

    if (isPoliceRow(row)) {
      openSidebar(
        `edit-police-${row.source_id}`,
        "Edit Police Account",
        "Update police account credentials",
        <PoliceAccountForm
          onSubmit={(data) => handlePoliceEditSubmit(row.source_id, data)}
          editData={{
            email: row.email,
            role: row.role as PoliceRole,
            is_verified: row.status === "active",
          }}
          disableVerificationToggle={false}
        />
      );
    } else {
      openSidebar(
        `edit-account-${row.source_id}`,
        "Edit Account",
        "Update account information",
        <AccountTableForm
          onSubmit={(data) => handleAccountEditSubmit(row.source_id, data)}
          editData={{
            email: row.email,
            role: row.role as AccountRole,
          }}
        />
      );
    }
  };

  const handleDelete = (row: AggregateAccountDto) => {
    if (row.status === "invited") {
      deleteInviteMutation.mutate(row.source_id);
    } else if (isPoliceRow(row)) {
      deletePoliceAccountMutation.mutate(row.source_id);
    } else {
      deleteAccountMutation.mutate(row.source_id);
    }
  };

  const handleResendInvite = (row: AggregateAccountDto) => {
    resendInviteMutation.mutate(row.source_id);
  };

  const handleCreate = () => {
    setEditingRow(null);
    openSidebar(
      "create-account",
      "New Invite",
      "Send a staff or admin invitation",
      <AccountTableForm onSubmit={handleAccountCreateSubmit} />
    );
  };

  const handleAccountCreateSubmit = async (data: AccountTableFormValues) => {
    createAccountMutation.mutate({
      email: data.email,
      role: data.role as InviteTokenRole,
    });
  };

  const handleAccountEditSubmit = async (
    accountId: number,
    data: AccountTableFormValues
  ) => {
    updateAccountMutation.mutate({
      id: accountId,
      data: { role: data.role as AccountRole },
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
        is_verified: data.is_verified,
      },
    });
  };

  const columns: ColumnDef<AggregateAccountDto>[] = [
    {
      accessorKey: "email",
      header: "Email",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "email" } },
    },
    {
      accessorKey: "first_name",
      header: "First Name",
      enableColumnFilter: true,
      meta: {
        filter: { type: "text", backendField: "first_name", nullable: true },
      },
      cell: ({ row }) => row.original.first_name ?? "—",
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      enableColumnFilter: true,
      meta: {
        filter: { type: "text", backendField: "last_name", nullable: true },
      },
      cell: ({ row }) => row.original.last_name ?? "—",
    },
    {
      accessorKey: "onyen",
      header: "Onyen",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "onyen", nullable: true } },
      cell: ({ row }) => row.original.onyen ?? "—",
    },
    {
      accessorKey: "pid",
      header: "PID",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "pid", nullable: true } },
      cell: ({ row }) => row.original.pid ?? "—",
    },
    {
      accessorKey: "role",
      header: "Role",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "role",
          selectOptions: [...ACCOUNT_ROLE_FILTER_OPTIONS],
        },
      },
      cell: ({ row }) => formatRoleLabel(row.getValue("role")),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "status",
          selectOptions: [...ACCOUNT_STATUS_FILTER_OPTIONS],
        },
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as AggregateAccountDto["status"];
        return status.charAt(0).toUpperCase() + status.slice(1);
      },
    },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col">
      <TableTemplate
        data={aggregateQuery.data?.items ?? []}
        columns={columns}
        resourceName="Account"
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNewRow={handleCreate}
        isLoading={aggregateQuery.isLoading}
        isFetching={aggregateQuery.isFetching}
        error={aggregateQuery.error as Error | null}
        getDeleteDescription={(row: AggregateAccountDto) =>
          `Are you sure you want to delete ${isPoliceRow(row) ? "police " : ""}account ${row.email}? This action cannot be undone.`
        }
        isDeleting={
          deleteAccountMutation.isPending ||
          deletePoliceAccountMutation.isPending ||
          deleteInviteMutation.isPending ||
          resendInviteMutation.isPending
        }
        canEditRow={(row) => row.status !== "invited"}
        canDeleteRow={(row) =>
          row.status === "invited" ||
          isPoliceRow(row) ||
          (session?.id != null && row.source_id !== session.id)
        }
        rowActions={[
          {
            label: "Resend invite",
            onClick: handleResendInvite,
            icon: <Send className="mr-2 size-4" />,
            isVisible: (row) => row.status === "invited",
          },
        ]}
        serverMeta={
          aggregateQuery.data
            ? {
                totalRecords: aggregateQuery.data.total_records,
                totalPages: aggregateQuery.data.total_pages,
                sortBy: aggregateQuery.data.sort_by,
                sortOrder: aggregateQuery.data.sort_order,
              }
            : undefined
        }
        onStateChange={setServerParams}
        onExportCsv={exportCsv}
        isExporting={isExporting}
      />
    </div>
  );
};
