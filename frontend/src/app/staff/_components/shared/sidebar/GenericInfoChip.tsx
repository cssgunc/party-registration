"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import info from "@/components/icons/info.svg";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
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
        isSelected ? "bg-primary text-card" : "bg-card text-foreground"
      )}
    >
      <Image src={info} alt="info" className="mr-2" />
      {shortName}
    </Badge>
  );
}
