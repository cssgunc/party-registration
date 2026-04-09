"use client";

import { ReactNode, createContext, useContext } from "react";
import { toast } from "sonner";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface SnackbarContextType {
  openSnackbar: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  loading: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(
  undefined
);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const openSnackbar = (
    message: string,
    type: ToastType,
    duration?: number
  ) => {
    switch (type) {
      case "success":
        toast.success(message, { duration });
        break;
      case "error":
        toast.error(message, { duration });
        break;
      case "warning":
        toast.warning(message, { duration });
        break;
      case "info":
        toast.info(message, { duration });
        break;
      case "loading":
        toast.loading(message);
        break;
      default:
        toast.message(message, { duration });
    }
  };

  const success = (message: string, duration?: number) =>
    openSnackbar(message, "success", duration);
  const error = (message: string, duration?: number) =>
    openSnackbar(message, "error", duration);
  const warning = (message: string, duration?: number) =>
    openSnackbar(message, "warning", duration);
  const info = (message: string, duration?: number) =>
    openSnackbar(message, "info", duration);
  const loading = (message: string) => openSnackbar(message, "loading");

  const value: SnackbarContextType = {
    openSnackbar,
    success,
    error,
    warning,
    info,
    loading,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextType {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}
