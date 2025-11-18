"use client";

import { useSidebar } from "@/components/SidebarContext";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface GenericInfoChipProps {
  chipKey: string;
  shortName: string;
  sidebarContent: ReactNode;
}

export function GenericInfoChip({
  chipKey,
  shortName,
  sidebarContent,
}: GenericInfoChipProps) {
  const { openSidebar, selectedKey } = useSidebar();
  const isSelected = selectedKey === chipKey;

  const handleOpen = () => {
    openSidebar(chipKey, sidebarContent);
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
