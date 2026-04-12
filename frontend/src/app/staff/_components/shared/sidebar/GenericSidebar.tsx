"use client";
import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

function GenericSidebar() {
  const { isOpen, closeSidebar, content } = useSidebar();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-modal-overlay z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 w-full max-w-96 h-full bg-card shadow-lg z-50 flex flex-col transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header — stays visible because only the content area below scrolls */}
        <div className="bg-card px-6 pt-6 pb-2">
          <Button
            className="bg-card pb-10 hover:bg-card"
            onClick={closeSidebar}
          >
            <XIcon className="text-muted-foreground size-6 -m-8" />
          </Button>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">{content}</div>
      </div>
    </>
  );
}

export default GenericSidebar;
