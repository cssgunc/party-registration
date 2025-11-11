"use client";

import { useSidebar } from "@/components/SidebarContext";
import { Badge } from "@/components/ui/badge";
import { ReactNode, useState } from "react";

interface GenericInfoChipProps<T> {
  data: T;
  renderSidebar: (data: T, onSave: (updated: T) => void) => ReactNode;
}

export function GenericInfoChip<T>({
  data,
  renderSidebar,
}: GenericInfoChipProps<T>) {
  const { openSidebar } = useSidebar();
  const [currentData, setCurrentData] = useState<T>(data);

  const handleOpen = () => {
    openSidebar(
      renderSidebar(currentData, (updated: T) => {
        setCurrentData(updated);
      })
    );
  };

  return (
    <Badge
      onClick={handleOpen}
      className="cursor-pointer hover:bg-blue-500 px-3 py-1"
    >
      {"Open Sidebar"}
      {/* TODO: Replace with actual data description */}
    </Badge>
  );
}
