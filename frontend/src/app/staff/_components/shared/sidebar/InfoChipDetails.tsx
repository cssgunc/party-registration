"use client";

import { ReactNode } from "react";

type InfoField = [label: string, value: ReactNode];

interface InfoChipDetailsProps {
  fields: InfoField[];
}

export function InfoChipDetails({ fields }: InfoChipDetailsProps) {
  return (
    <div className="space-y-4 mt-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <p className="content-bold text-lg">{label}</p>
          <p className="text-base">{value}</p>
        </div>
      ))}
    </div>
  );
}
