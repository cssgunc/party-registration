"use client";

import { Location } from "@/types/api/location";
import { GenericChipDetails } from "./GenericChipDetails";

interface LocationInfoChipDetailsProps {
  data: Location;
  onSave: (updated: Location) => void;
}

export function LocationInfoChipDetails({
  data,
  onSave,
}: LocationInfoChipDetailsProps) {
  return (
    <GenericChipDetails<Location>
      data={data}
      onSave={onSave}
      renderForm={(d, setD) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input
              className="border p-2 w-full rounded"
              value={d.formattedAddress}
              onChange={(e) => setD({ ...d, formattedAddress: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Warning Count</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={d.warningCount}
              onChange={(e) =>
                setD({ ...d, warningCount: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Citation Count</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={d.citationCount}
              onChange={(e) =>
                setD({ ...d, citationCount: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Active Hold</label>
            <select
              className="border p-2 w-full rounded"
              value={d.hasActiveHold.toString()}
              onChange={(e) =>
                setD({ ...d, hasActiveHold: e.target.value === "true" })
              }
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      )}
    />
  );
}

export default LocationInfoChipDetails;
