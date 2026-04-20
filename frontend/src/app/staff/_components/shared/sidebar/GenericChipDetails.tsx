"use client";

import { ReactNode } from "react";

interface GenericChipDetailsProps<T> {
  data: T;
  renderView: (value: T) => ReactNode;
}

export function GenericChipDetails<T>({
  data,
  renderView,
}: GenericChipDetailsProps<T>) {
  return <div className="space-y-3">{renderView(data)}</div>;
}
