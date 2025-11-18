"use client";

import { ReactNode } from "react";
import { BsLayoutSidebar } from "react-icons/bs";

interface GenericChipDetailsProps<T> {
  data: T;
  title: string;
  description: string;
  renderView: (value: T) => ReactNode;
}

export function GenericChipDetails<T>({
  data,
  title,
  description,
  renderView,
}: GenericChipDetailsProps<T>) {
  return (
    <div className="space-y-3">
      <div>
        <BsLayoutSidebar />
      </div>
      <h1 className="text-lg font-bold">{title}</h1>
      <h2 className="text-lg">{description}</h2>
      {renderView(data)}
    </div>
  );
}
