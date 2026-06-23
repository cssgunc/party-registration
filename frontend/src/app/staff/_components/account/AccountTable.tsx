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
  AggregateAccountDto,
  InviteTokenRole,
} from "@/lib/api/account/account.types";
import { ACCOUNT_ROLES } from "@/lib/api/account/account.types";
import type { PoliceRole } from "@/lib/api/police/police.types";
import { getErrorMessage } from "@/lib/errors";
import { formatRoleLabel } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Send, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import * as z from "zod";
import { FormSidebar } from "../shared/sidebar/FormSidebar";
import { useFormSidebarState } from "../shared/sidebar/useFormSidebarState";
import { TableTemplate } from "../shared/table/TableTemplate";
import {
  type RowAction,
  deleteAction,
  editAction,
} from "../shared/table/rowActions";
import { useServerTableState } from "../shared/table/useServerTableState";
import AccountTableForm, { accountTableFormSchema } from "./AccountTableForm";
import PoliceAccountTableForm, {
  type PoliceAccountFormValues,
} from "./PoliceAccountTableForm";

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

const ACCOUNT_ERROR_OPTIONS = {
  status: {
    403: "Cannot remove the last remaining admin",
    404: "Account not found",
    409: "An account with this email already exists",
  },
  fallback: "Failed to complete the account action. Please try again.",
} as const;

const POLICE_ACCOUNT_ERROR_OPTIONS = {
  ...ACCOUNT_ERROR_OPTIONS,
  fallback: "Failed to update police account",
} as const;

/**
 * Staff dashboard Accounts tab (admin-only) — server-paginated aggregate view of all accounts.
 *
 * Combines staff/admin accounts and police accounts in a single table. Admins
 * can invite new staff, edit existing accounts (routing to the correct form for
 * staff vs police rows), resend or revoke pending invitations, and delete
 * accounts. Supports CSV export.
 */
export const AccountTable = () => {
  const { openSnackbar, snackbarPromise } = useSnackbar();
  const { data: session } = useSession();
  const {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openCreate,
    openEdit,
    closeSidebar,
  } = useFormSidebarState<AggregateAccountDto>();

  const exportMutation = useDownloadAggregateAccountsCsv();

  const createAccountMutation = useCreateAccount({
    onError: (error: Error) => {
      setSubmissionError(getErrorMessage(error, ACCOUNT_ERROR_OPTIONS));
    },
    onSuccess: () => {
      closeSidebar();
      openSnackbar("Invite sent successfully", "success");
    },
  });

  const updateAccountMutation = useUpdateAccount({
    onError: (error: Error) => {
      setSubmissionError(getErrorMessage(error, ACCOUNT_ERROR_OPTIONS));
    },
    onSuccess: () => {
      openSnackbar("Account edited successfully", "success");
      closeSidebar();
    },
  });

  const updatePoliceAccountMutation = useUpdatePoliceAccount({
    onError: (error: Error) => {
      setSubmissionError(getErrorMessage(error, POLICE_ACCOUNT_ERROR_OPTIONS));
    },
    onSuccess: () => {
      openSnackbar("Police account updated successfully", "success");
      closeSidebar();
    },
  });

  const deleteAccountMutation = useDeleteAccount();
  const deletePoliceAccountMutation = useDeletePoliceAccount();
  const deleteInviteMutation = useDeleteInvite();
  const resendInviteMutation = useResendInvite();

  const handleEdit = (row: AggregateAccountDto) => {
    if (row.status === "invited") return;
    openEdit(row);
  };

  const handleRevokeInvite = (row: AggregateAccountDto) => {
    snackbarPromise(deleteInviteMutation.mutateAsync(row.source_id), {
      loading: "Revoking invite...",
      success: "Invite revoked successfully",
      error: (err) => getErrorMessage(err, ACCOUNT_ERROR_OPTIONS),
    });
  };

  const handleDelete = (row: AggregateAccountDto) => {
    if (isPoliceRow(row)) {
      snackbarPromise(deletePoliceAccountMutation.mutateAsync(row.source_id), {
        loading: "Deleting police account...",
        success: "Police account deleted successfully",
        error: "Failed to delete police account",
      });
    } else {
      snackbarPromise(deleteAccountMutation.mutateAsync(row.source_id), {
        loading: "Deleting account...",
        success: "Account deleted successfully",
        error: (err) => getErrorMessage(err, ACCOUNT_ERROR_OPTIONS),
      });
    }
  };

  const handleAccountCreateSubmit = async (data: AccountTableFormValues) => {
    createAccountMutation.mutate({
      email: data.email,
      role: data.role,
    });
  };

  const handleAccountEditSubmit = async (
    accountId: number,
    data: AccountTableFormValues
  ) => {
    updateAccountMutation.mutate({
      id: accountId,
      data: { role: data.role },
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

  const serverTableState = useServerTableState({
    columns,
    pageSizeStorageKey: "staff-accounts",
  });
  const query = useAggregateAccounts(serverTableState.serverParams);

  return (
    <>
      <TableTemplate
        query={query}
        serverTableState={serverTableState}
        columns={columns}
        createAction={{ label: "New Invite", fn: openCreate }}
        rowActions={[
          editAction<AggregateAccountDto>({
            onClick: handleEdit,
            isVisible: (row) => row.status !== "invited",
          }),
          {
            label: "Resend invite",
            onClick: (row) =>
              snackbarPromise(resendInviteMutation.mutateAsync(row.source_id), {
                loading: "Resending invite...",
                success: "Invite resent successfully",
                error: (err) => getErrorMessage(err, ACCOUNT_ERROR_OPTIONS),
              }),
            icon: <Send className="mr-2 size-4" />,
            isVisible: (row) => row.status === "invited",
          } satisfies RowAction<AggregateAccountDto>,
          {
            label: "Revoke invite",
            icon: <Trash2 className="mr-2 size-4" />,
            variant: "destructive",
            isVisible: (row) => row.status === "invited",
            confirm: {
              title: "Revoke Invite",
              description: (row) =>
                `Are you sure you want to revoke the invite for ${row.email}? This action cannot be undone.`,
              confirmLabel: "Revoke",
              pendingLabel: "Revoking...",
              isPending: deleteInviteMutation.isPending,
            },
            onClick: handleRevokeInvite,
          } satisfies RowAction<AggregateAccountDto>,
          deleteAction<AggregateAccountDto>({
            onClick: handleDelete,
            resourceName: "Account",
            description: (row) =>
              `Are you sure you want to delete ${isPoliceRow(row) ? "police " : ""}account ${row.email}? This action cannot be undone.`,
            isPending:
              deleteAccountMutation.isPending ||
              deletePoliceAccountMutation.isPending ||
              resendInviteMutation.isPending,
            isVisible: (row) =>
              row.status !== "invited" &&
              (isPoliceRow(row) ||
                (session?.id != null && row.source_id !== session.id)),
          }),
        ]}
        exportMutation={exportMutation}
      />
      <FormSidebar
        mode={mode}
        row={row}
        modes={{
          create: {
            key: "create-account",
            title: "New Invite",
            description: "Send a staff or admin invitation",
            render: () => (
              <AccountTableForm
                onSubmit={handleAccountCreateSubmit}
                submissionError={submissionError}
                isPending={createAccountMutation.isPending}
              />
            ),
          },
          edit: {
            key: (account) =>
              isPoliceRow(account)
                ? `edit-police-${account.source_id}`
                : `edit-account-${account.source_id}`,
            title: (account) =>
              isPoliceRow(account) ? "Edit Police Account" : "Edit Account",
            description: (account) =>
              isPoliceRow(account)
                ? "Update police account credentials"
                : "Update account information",
            render: (account) =>
              isPoliceRow(account) ? (
                <PoliceAccountTableForm
                  onSubmit={(data) =>
                    handlePoliceEditSubmit(account.source_id, data)
                  }
                  submissionError={submissionError}
                  isPending={updatePoliceAccountMutation.isPending}
                  editData={{
                    email: account.email,
                    role: account.role as PoliceRole,
                    is_verified: account.status === "active",
                  }}
                  disableVerificationToggle={false}
                />
              ) : (
                <AccountTableForm
                  onSubmit={(data) =>
                    handleAccountEditSubmit(account.source_id, data)
                  }
                  submissionError={submissionError}
                  isPending={updateAccountMutation.isPending}
                  editData={{
                    email: account.email,
                    role: account.role as InviteTokenRole,
                  }}
                />
              ),
          },
        }}
        onClose={closeSidebar}
      />
    </>
  );
};
