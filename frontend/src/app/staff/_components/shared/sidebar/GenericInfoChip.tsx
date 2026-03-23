"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GenericInfoChipProps {
  chipKey: string;
  shortName: string;
  title: string;
  description: string;
  sidebarContent: ReactNode;
}

export function GenericInfoChip({
  chipKey,
  shortName,
  title,
  description,
  sidebarContent,
}: GenericInfoChipProps) {
  const { openSidebar, selectedKey, closeSidebar } = useSidebar();
  const isSelected = selectedKey === chipKey;

  const handleOpen = () => {
    if (isSelected) {
      closeSidebar();
      return;
    } else {
      openSidebar(chipKey, title, description, sidebarContent);
    }
  };

  return (
    <Badge
      onClick={handleOpen}
      className={cn(
        "cursor-pointer px-3 py-1",
        isSelected ? "bg-primary text-card" : "bg-muted text-foreground"
      )}
    >
      {shortName}
    </Badge>
  );
}
