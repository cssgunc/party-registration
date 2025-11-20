"use client";

import { useSidebar } from "@/components/SidebarContext";
import { Badge } from "@/components/ui/badge";
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
      className={`cursor-pointer px-3 py-1 ${
        isSelected ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
      }`}
    >
      {shortName}
    </Badge>
  );
}
