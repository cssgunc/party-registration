import { Pencil, Trash2 } from "lucide-react";
import { ReactNode } from "react";

export type RowActionConfirm<T> = {
  title: string;
  description?: (row: T) => string;
  isPending?: boolean;
  confirmLabel?: string;
  dismissLabel?: string;
  pendingLabel?: string;
};

export type RowAction<T> = {
  label: string;
  icon?: ReactNode;
  onClick: (row: T) => void;
  isVisible?: (row: T) => boolean;
  variant?: "default" | "destructive";
  /** When true, the row is marked selected before onClick fires (used to open the edit sidebar). */
  selectRow?: boolean;
  /** When set, a confirmation dialog is shown before invoking onClick. */
  confirm?: RowActionConfirm<T>;
};

export function editAction<T>(opts: {
  onClick: (row: T) => void;
  isVisible?: (row: T) => boolean;
}): RowAction<T> {
  return {
    label: "Edit",
    icon: <Pencil className="mr-2 size-4" />,
    selectRow: true,
    ...opts,
  };
}

export function deleteAction<T>(opts: {
  onClick: (row: T) => void;
  resourceName: string;
  description?: (row: T) => string;
  isVisible?: (row: T) => boolean;
  isPending?: boolean;
}): RowAction<T> {
  const { resourceName, description, isPending, ...rest } = opts;
  return {
    label: "Delete",
    icon: <Trash2 className="mr-2 size-4" />,
    variant: "destructive",
    confirm: {
      title: `Delete ${resourceName}`,
      description:
        description ??
        (() =>
          `Are you sure you want to delete this ${resourceName.toLowerCase()}? This action cannot be undone.`),
      confirmLabel: "Delete",
      pendingLabel: "Deleting...",
      isPending,
    },
    ...rest,
  };
}
