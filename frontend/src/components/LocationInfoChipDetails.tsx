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
              value={d.formatted_address}
              onChange={(e) =>
                setD({ ...d, formatted_address: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Warning Count</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={d.warning_count}
              onChange={(e) =>
                setD({ ...d, warning_count: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Citation Count</label>
            <input
              type="number"
              className="border p-2 w-full rounded"
              value={d.citation_count}
              onChange={(e) =>
                setD({ ...d, citation_count: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Active Hold</label>
            <select
              className="border p-2 w-full rounded"
              value={d.has_active_hold.toString()}
              onChange={(e) =>
                setD({ ...d, has_active_hold: e.target.value === "true" })
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
