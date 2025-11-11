"use client";

import { useSidebar } from "@/components/SidebarContext";
import { ReactNode, useState } from "react";

interface GenericChipDetailsProps<T> {
  data: T;
  onSave: (updatedData: T) => void;
  renderForm: (value: T, setValue: (v: T) => void) => ReactNode;
}

export function GenericChipDetails<T>({
  data,
  onSave,
  renderForm,
}: GenericChipDetailsProps<T>) {
  const [localData, setLocalData] = useState<T>(data);
  const { closeSidebar } = useSidebar();

  const handleSave = () => {
    onSave(localData);
    closeSidebar();
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Edit Info</h2>
      {renderForm(localData, setLocalData)}
      <div className="flex gap-2 mt-3">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="bg-gray-300 text-black px-3 py-1 rounded"
          onClick={closeSidebar}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
