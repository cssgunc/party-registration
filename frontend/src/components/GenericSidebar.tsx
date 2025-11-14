"use client";
import { useSidebar } from "@/components/SidebarContext";

export function GenericSidebar() {
  const { isOpen, content, closeSidebar } = useSidebar();

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-lg p-4 overflow-auto z-50">
      <button
        className="mb-4 px-3 py-1 bg-gray-200 rounded"
        onClick={closeSidebar}
      >
        Close
      </button>
      {content}
    </div>
  );
}
