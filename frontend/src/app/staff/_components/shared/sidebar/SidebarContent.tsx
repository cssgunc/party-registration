"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSidebar } from "./SidebarContext";

interface Props {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  sidebarKey: string;
  title: string;
  description: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

export function SidebarContent({
  open,
  onOpenChange,
  sidebarKey,
  title,
  description,
  children,
  headerAction,
}: Props) {
  const { openSidebar, closeSidebar, selectedKey, bodyNode, headerActionNode } =
    useSidebar();
  const activeSidebarKeyRef = useRef<string | null>(null);

  // Push chrome state to context when we should be open.
  // useLayoutEffect so the chrome update + portal mount happen in the same
  // paint as the caller's state change (no visible one-frame gap).
  useLayoutEffect(() => {
    if (open) {
      activeSidebarKeyRef.current = sidebarKey;
      openSidebar(sidebarKey, title, description);
    } else if (
      activeSidebarKeyRef.current &&
      selectedKey === activeSidebarKeyRef.current
    ) {
      closeSidebar();
      activeSidebarKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedKey is intentionally excluded; the ref pattern handles stale reads without re-running on every key change
  }, [open, sidebarKey, title, description, openSidebar, closeSidebar]);

  // On unmount while active, close the chrome
  useEffect(() => {
    return () => {
      if (
        activeSidebarKeyRef.current &&
        selectedKeyRef.current === activeSidebarKeyRef.current
      ) {
        closeSidebar();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only cleanup; closeSidebar is intentionally excluded (unstable reference, would run cleanup on every context re-render)
  }, []);

  // Keep a ref to the latest selectedKey so the unmount cleanup can read it
  const selectedKeyRef = useRef(selectedKey);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  // Detect external close (X button, backdrop, another sidebar taking over):
  // we were the active sidebar, now we are not, but caller still thinks we're open
  const wasActiveRef = useRef(false);
  useEffect(() => {
    const isActive = open && selectedKey === sidebarKey;
    if (wasActiveRef.current && !isActive && open) {
      onOpenChange?.(false);
    }
    wasActiveRef.current = isActive;
  }, [open, selectedKey, sidebarKey, onOpenChange]);

  if (!open || selectedKey !== sidebarKey) return null;

  return (
    <>
      {bodyNode && createPortal(children, bodyNode)}
      {headerAction &&
        headerActionNode &&
        createPortal(headerAction, headerActionNode)}
    </>
  );
}
