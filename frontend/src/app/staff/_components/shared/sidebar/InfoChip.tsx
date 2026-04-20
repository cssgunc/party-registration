"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { ReactNode } from "react";

interface InfoChipProps {
  chipKey: string;
  shortName: string;
  title: string;
  description: string;
  sidebarContent: ReactNode;
}

export function InfoChip({
  chipKey,
  shortName,
  title,
  description,
  sidebarContent,
}: InfoChipProps) {
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
        "cursor-pointer border border-transparent bg-transparent px-3 py-1 transition-colors [&>svg]:size-auto leading-0 -translate-x-4",
        isSelected
          ? "bg-primary text-white hover:bg-primary/15"
          : "text-foreground hover:bg-gray-500/10"
      )}
    >
      <Info size={14} className="mr-1 shrink-0 -translate-y-px" />
      {shortName}
    </Badge>
  );
}
