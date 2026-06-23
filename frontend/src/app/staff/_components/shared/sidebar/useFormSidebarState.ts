"use client";

import { useState } from "react";

export type FormSidebarMode = "create" | "edit";

/**
 * Manage open/closed state and the currently selected row for a create/edit sidebar.
 *
 * Tracks the sidebar mode (`"create"` | `"edit"` | `null`), the row being
 * edited, and any submission error string. Exposes `openCreate`, `openEdit`,
 * and `closeSidebar` actions that reset the error on each transition.
 */
export function useFormSidebarState<T>() {
  const [mode, setMode] = useState<FormSidebarMode | null>(null);
  const [row, setRow] = useState<T | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const openCreate = () => {
    setSubmissionError(null);
    setRow(null);
    setMode("create");
  };

  const openEdit = (nextRow: T) => {
    setSubmissionError(null);
    setRow(nextRow);
    setMode("edit");
  };

  const closeSidebar = () => {
    setMode(null);
    setRow(null);
    setSubmissionError(null);
  };

  return {
    mode,
    row,
    submissionError,
    setSubmissionError,
    openCreate,
    openEdit,
    closeSidebar,
  };
}
