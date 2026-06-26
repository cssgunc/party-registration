"use client";

import { ReactNode } from "react";
import { SidebarContent } from "./SidebarContent";
import { FormSidebarMode } from "./useFormSidebarState";

type ResolvableText<T> = string | ((row: T) => string);

export type CreateModeConfig = {
  key: string;
  title: string;
  description: string;
  render: () => ReactNode;
};

export type EditModeConfig<T> = {
  key: (row: T) => string;
  title: ResolvableText<T>;
  description: ResolvableText<T>;
  render: (row: T) => ReactNode;
};

type FormSidebarProps<T> = {
  mode: FormSidebarMode | null;
  row: T | null;
  modes: {
    create?: CreateModeConfig;
    edit?: EditModeConfig<T>;
  };
  onClose: () => void;
};

const resolveText = <T,>(value: ResolvableText<T>, row: T) =>
  typeof value === "function" ? value(row) : value;

/**
 * Sidebar panel that renders a create or edit form for a table row.
 *
 * Selects between `modes.create` and `modes.edit` based on the current
 * `mode` value, resolves the key, title, and description (which may be
 * static strings or row-based functions), and delegates rendering to
 * `SidebarContent`. Returns null when no mode is active or when the
 * required config for the active mode is missing.
 */
export function FormSidebar<T>({
  mode,
  row,
  modes,
  onClose,
}: FormSidebarProps<T>) {
  if (!mode) return null;

  let sidebarKey: string;
  let title: string;
  let description: string;
  let body: ReactNode;

  if (mode === "create") {
    if (!modes.create) return null;
    ({ key: sidebarKey, title, description } = modes.create);
    body = modes.create.render();
  } else {
    if (!modes.edit || !row) return null;
    sidebarKey = modes.edit.key(row);
    title = resolveText(modes.edit.title, row);
    description = resolveText(modes.edit.description, row);
    body = modes.edit.render(row);
  }

  return (
    <SidebarContent
      open
      onOpenChange={(open) => !open && onClose()}
      sidebarKey={sidebarKey}
      title={title}
      description={description}
    >
      {body}
    </SidebarContent>
  );
}
