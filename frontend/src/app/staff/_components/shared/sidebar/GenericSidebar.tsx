"use client";
import { useSidebar } from "@/app/staff/_components/shared/sidebar/SidebarContext";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function GenericSidebar() {
  const { isOpen, closeSidebar, content } = useSidebar();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-modal-overlay z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 w-96 h-full bg-card shadow-lg overflow-auto z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6">
          <Button
            className="bg-card pb-10 hover:bg-card"
            onClick={closeSidebar}
          >
            <XIcon className="text-muted-foreground size-6 -m-8" />
          </Button>
          <div className="space-y-4">{content}</div>
        </div>
      </div>
    </>
  );
}

export default GenericSidebar;
