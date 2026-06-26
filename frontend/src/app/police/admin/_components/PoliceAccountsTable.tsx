"use client";

import PoliceAccountTableForm, {
  type PoliceAccountFormValues,
} from "@/app/staff/_components/account/PoliceAccountTableForm";
import { FormSidebar } from "@/app/staff/_components/shared/sidebar/FormSidebar";
import { useFormSidebarState } from "@/app/staff/_components/shared/sidebar/useFormSidebarState";
import { TableTemplate } from "@/app/staff/_components/shared/table/TableTemplate";
import {
  deleteAction,
  editAction,
} from "@/app/staff/_components/shared/table/rowActions";
import { useServerTableState } from "@/app/staff/_components/shared/table/useServerTableState";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useDeletePoliceAccount,
  useDownloadPoliceAccountsCsv,
  usePoliceAccountsPaginated,
  useUpdatePoliceAccount,
} from "@/lib/api/account/account.queries";
import type { PoliceAccountDto } from "@/lib/api/police/police.types";
import { getErrorMessage } from "@/lib/errors";
import { formatRoleLabel } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";

/**
 * Paginated, sortable, and filterable table of police accounts for the admin
 * dashboard.
 *
 * Wires up `useServerTableState` for server-side pagination/sorting/filtering,
 * the `TableTemplate` for the data table UI, and a `FormSidebar` for inline
 * editing. Delete is guarded so an admin cannot remove their own account.
 */
export default function PoliceAccountsTable() {
  const { data: session } = useSession();
  const { openSnackbar, snackbarPromise } = useSnackbar();
  const {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openEdit,
    closeSidebar,
  } = useFormSidebarState<PoliceAccountDto>();
  const downloadPoliceAccountsCsv = useDownloadPoliceAccountsCsv({
    onError: () => {
      openSnackbar("Failed to export police accounts.", "error");
    },
  });

  const updatePoliceAccountMutation = useUpdatePoliceAccount({
    onError: (error: Error) => {
      setSubmissionError(
        getErrorMessage(error, {
          status: {
            409: "That email is already in use by another police account.",
          },
          fallback: "Failed to update police account.",
        })
      );
    },
    onSuccess: () => {
      openSnackbar("Police account updated successfully", "success");
      closeSidebar();
    },
  });

  const deletePoliceAccountMutation = useDeletePoliceAccount();

  const currentPoliceId = session?.id ? Number(session.id) : null;

  const handleDelete = (row: PoliceAccountDto) => {
    if (row.id === currentPoliceId) {
      openSnackbar("You cannot delete your own account", "error");
      return;
    }
    snackbarPromise(deletePoliceAccountMutation.mutateAsync(row.id), {
      loading: "Deleting police account...",
      success: "Police account deleted successfully",
      error: "Failed to delete police account",
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
        role: data.role,
        is_verified: data.is_verified,
      },
    });
  };

  const columns: ColumnDef<PoliceAccountDto>[] = [
    {
      accessorKey: "email",
      header: "Email",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "email" } },
    },
    {
      accessorKey: "role",
      header: "Role",
      enableColumnFilter: true,
      meta: { filter: { type: "text", backendField: "role" } },
      cell: ({ row }) =>
        formatRoleLabel(row.getValue("role") as PoliceAccountDto["role"]),
    },
    {
      accessorKey: "is_verified",
      header: "Verified",
      enableColumnFilter: true,
      meta: {
        filter: {
          type: "select",
          backendField: "is_verified",
          selectOptions: ["true", "false"],
        },
      },
      cell: ({ row }) => (row.original.is_verified ? "Yes" : "No"),
    },
  ];

  const serverTableState = useServerTableState({
    columns,
    pageSizeStorageKey: "police-accounts",
  });
  const query = usePoliceAccountsPaginated(serverTableState.serverParams);

  return (
    <>
      <TableTemplate
        query={query}
        serverTableState={serverTableState}
        columns={columns}
        rowActions={[
          editAction<PoliceAccountDto>({ onClick: openEdit }),
          deleteAction<PoliceAccountDto>({
            onClick: handleDelete,
            resourceName: "Police Account",
            description: (row) =>
              `Are you sure you want to delete police account ${row.email}? This action cannot be undone.`,
            isPending: deletePoliceAccountMutation.isPending,
            isVisible: (row) => row.id !== currentPoliceId,
          }),
        ]}
        exportMutation={downloadPoliceAccountsCsv}
      />
      <FormSidebar
        mode={mode}
        row={row}
        modes={{
          edit: {
            key: (account) => `edit-police-${account.id}`,
            title: "Edit Police Account",
            description: "Update police account credentials",
            render: (account) => (
              <PoliceAccountTableForm
                onSubmit={(data) => handlePoliceEditSubmit(account.id, data)}
                submissionError={submissionError}
                isPending={updatePoliceAccountMutation.isPending}
                editData={{
                  email: account.email,
                  role: account.role,
                  is_verified: account.is_verified,
                }}
                disableVerificationToggle
              />
            ),
          },
        }}
        onClose={closeSidebar}
      />
    </>
  );
}
