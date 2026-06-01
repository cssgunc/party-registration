"use client";

import { useState } from "react";

export type FormSidebarMode = "create" | "edit";

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
