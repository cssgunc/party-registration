"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSidebar } from "./SidebarContext";

function Sidebar() {
  const { isOpen, content, closeSidebar } = useSidebar();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSidebar()}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Details</SheetTitle>
        </SheetHeader>
        <div className="mt-4">{content}</div>
      </SheetContent>
    </Sheet>
  );
}

export default Sidebar;
