"use client";
import { useSidebar } from "@/components/SidebarContext";
import { Button } from "./ui/button";

function GenericSidebar() {
  const { isOpen, closeSidebar, content } = useSidebar();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg overflow-auto z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6">
          <Button className="mb-6" onClick={closeSidebar}>
            Close
          </Button>
          <div className="space-y-4">{content}</div>
        </div>
      </div>
    </>
  );
}

export default GenericSidebar;
