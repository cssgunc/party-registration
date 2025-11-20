"use client";

import { Button } from "@/components/ui/button";
import { AccountService } from "@/services/accountService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import * as z from "zod";
import AccountTableCreateEditForm, {
  AccountCreateEditValues as AccountCreateEditSchema,
} from "./AccountTableCreateEdit";
import { TableTemplate } from "./TableTemplate";

import type { Account, AccountRole } from "@/services/accountService";

type AccountCreateEditValues = z.infer<typeof AccountCreateEditSchema>;

const accountService = new AccountService();

export const AccountTable = () => {
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"create" | "edit">("create");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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
      a.last_name.localeCompare(b.last_name) ||
      a.first_name.localeCompare(b.first_name),
  );

  const createMutation = useMutation({
    mutationFn: (data: AccountCreateEditValues) =>
      accountService.createAccount({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        pid: data.pid,
        role: data.role as AccountRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSidebarOpen(false);
      setEditingAccount(null);
    },
    onError: (error: Error) => {
      console.error("Failed to create account:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountCreateEditValues }) =>
      accountService.updateAccount(id, {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        pid: data.pid,
        role: data.role as AccountRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSidebarOpen(false);
      setEditingAccount(null);
    },
    onError: (error: Error) => {
      console.error("Failed to update account:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountService.deleteAccount(id),
    // Optimistically remove the account from the cache.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["accounts"] });

      const previous = queryClient.getQueryData<Account[]>(["accounts"]);

      queryClient.setQueryData<Account[] | undefined>(
        ["accounts"],
        (old) => old?.filter((a) => a.id !== id),
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
    setSidebarOpen(true);
  };

  const handleDelete = (account: Account) => {
    deleteMutation.mutate(account.id);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setSidebarMode("create");
    setSidebarOpen(true);
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

      {sidebarOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-6 overflow-y-auto z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {sidebarMode === "create" ? "New Account" : "Edit Account"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              Close
            </Button>
          </div>
          <AccountTableCreateEditForm
            onSubmit={handleFormSubmit}
            editData={
              editingAccount
                ? {
                    email: editingAccount.email,
                    firstName: editingAccount.first_name,
                    lastName: editingAccount.last_name,
                    role: editingAccount.role,
                    pid: editingAccount.pid ?? "",
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
