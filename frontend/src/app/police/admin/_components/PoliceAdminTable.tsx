"use client";

import PoliceAccountForm, {
  type PoliceAccountFormValues,
} from "@/app/staff/_components/account/PoliceAccountForm";
import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { TableTemplate } from "@/app/staff/_components/shared/table/TableTemplate";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/contexts/SnackbarContext";
import {
  useDeletePoliceAccount,
  useDownloadPoliceAccountsCsv,
  usePoliceAccountsPaginated,
  useUpdatePoliceAccount,
} from "@/lib/api/account/account.queries";
import type {
  PoliceAccountDto,
  PoliceAccountUpdate,
} from "@/lib/api/police/police.types";
import {
  DEFAULT_TABLE_PARAMS,
  type ServerColumnMap,
  type ServerTableParams,
} from "@/lib/api/shared/query-params";
import { formatRoleLabel } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

const SERVER_COLUMN_MAP: ServerColumnMap = {
  email: { backendField: "email", filterOperator: "contains" },
  role: { backendField: "role", filterOperator: "eq" },
};

export default function PoliceAdminTable() {
  const { data: session } = useSession();
  const { openSidebar, closeSidebar } = useSidebar();
  const { openSnackbar } = useSnackbar();
  const [serverParams, setServerParams] =
    useState<ServerTableParams>(DEFAULT_TABLE_PARAMS);

  const policeAccountsQuery = usePoliceAccountsPaginated(serverParams);
  const downloadPoliceAccountsCsv = useDownloadPoliceAccountsCsv({
    onError: (error: Error) => {
      openSnackbar(
        error.message || "Failed to export police accounts",
        "error"
      );
    },
  });

  const updatePoliceAccountMutation = useUpdatePoliceAccount({
    onError: (
      error: Error,
      variables: { id: number; data: PoliceAccountUpdate }
    ) => {
      openSidebar(
        `edit-police-${variables.id}`,
        "Edit Police Account",
        "Update police account credentials",
        <PoliceAccountForm
          title="Edit Police Account"
          onSubmit={(data) => handlePoliceEditSubmit(variables.id, data)}
          submissionError={error.message}
          editData={{ email: variables.data.email, role: variables.data.role }}
        />
      );
    },
    onSuccess: () => {
      closeSidebar();
      openSnackbar("Police account updated successfully", "success");
    },
  });

  const deletePoliceAccountMutation = useDeletePoliceAccount({
    onSuccess: () => {
      openSnackbar("Police account deleted successfully", "success");
    },
    onError: (error: Error) => {
      openSnackbar(error.message || "Failed to delete police account", "error");
    },
  });

  const currentPoliceId = session?.id ? Number(session.id) : null;

  const handleEdit = (row: PoliceAccountDto) => {
    openSidebar(
      `edit-police-${row.id}`,
      "Edit Police Account",
      "Update police account credentials",
      <PoliceAccountForm
        title="Edit Police Account"
        onSubmit={(data) => handlePoliceEditSubmit(row.id, data)}
        editData={{ email: row.email, role: row.role }}
      />
    );
  };

  const handleDelete = (row: PoliceAccountDto) => {
    if (row.id === currentPoliceId) {
      openSnackbar("You cannot delete your own account", "error");
      return;
    }
    deletePoliceAccountMutation.mutate(row.id);
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
      },
    });
  };

  const columns: ColumnDef<PoliceAccountDto>[] = useMemo(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        enableColumnFilter: true,
      },
      {
        accessorKey: "role",
        header: "Role",
        enableColumnFilter: true,
        cell: ({ row }) =>
          formatRoleLabel(row.getValue("role") as PoliceAccountDto["role"]),
      },
    ],
    []
  );

  const tableData = policeAccountsQuery.data?.items ?? [];

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => downloadPoliceAccountsCsv.mutate(serverParams)}
          disabled={downloadPoliceAccountsCsv.isPending}
        >
          <Download className="mr-2 h-4 w-4" />
          {downloadPoliceAccountsCsv.isPending
            ? "Exporting..."
            : "Export Excel"}
        </Button>
      </div>
      <TableTemplate
        data={tableData}
        columns={columns}
        resourceName="Police Account"
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={policeAccountsQuery.isLoading}
        isFetching={policeAccountsQuery.isFetching}
        error={(policeAccountsQuery.error as Error | null) ?? null}
        getDeleteDescription={(row: PoliceAccountDto) =>
          `Are you sure you want to delete police account ${row.email}? This action cannot be undone.`
        }
        isDeleting={deletePoliceAccountMutation.isPending}
        serverMeta={
          policeAccountsQuery.data
            ? {
                totalRecords: policeAccountsQuery.data.total_records,
                totalPages: policeAccountsQuery.data.total_pages,
              }
            : undefined
        }
        onStateChange={setServerParams}
        columnMap={SERVER_COLUMN_MAP}
        canManageRows={session?.role === "police_admin"}
        canDeleteRow={(row) => row.id !== currentPoliceId}
      />
    </div>
  );
}
