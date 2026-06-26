"use client";

import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { ReactNode, useState } from "react";
import { SidebarContent } from "./SidebarContent";

interface InfoChipProps {
  chipKey: string;
  shortName: string;
  title: string;
  description: string;
  sidebarContent: ReactNode;
}

/**
 * Inline pill button that opens a detail panel in the staff sidebar.
 *
 * Renders a ghost button showing `shortName`; clicking it toggles a
 * `SidebarContent` panel keyed by `chipKey`. While this panel is active
 * the button adopts the primary colour so the selected row is visually clear.
 */
export function InfoChip({
  chipKey,
  shortName,
  title,
  description,
  sidebarContent,
}: InfoChipProps) {
  const { selectedKey } = useSidebar();
  const [open, setOpen] = useState(false);

  // Stay in sync if another chip/sidebar takes over
  const isSelected = selectedKey === chipKey;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!isSelected)}
        className={cn(
          "cursor-pointer border border-transparent bg-transparent px-3 py-1 rounded-full transition-colors leading-0 -translate-x-4 text-sm font-normal",
          isSelected
            ? "bg-primary text-white hover:bg-primary/15"
            : "text-foreground hover:bg-gray-500/10"
        )}
      >
        <Info size={14} className="mr-1 shrink-0 -translate-y-px" />
        {shortName}
      </Button>
      <SidebarContent
        open={open}
        onOpenChange={setOpen}
        sidebarKey={chipKey}
        title={title}
        description={description}
      >
        {sidebarContent}
      </SidebarContent>
    </>
  );
}
