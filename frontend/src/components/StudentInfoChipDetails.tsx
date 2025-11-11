"use client";

import { Student } from "@/types/api/student";
import { GenericChipDetails } from "./GenericChipDetails";

interface StudentInfoChipDetailsProps {
  data: Student;
  onSave: (updated: Student) => void;
}

export function StudentInfoChipDetails({
  data,
  onSave,
}: StudentInfoChipDetailsProps) {
  return (
    <GenericChipDetails<Student>
      data={data}
      onSave={onSave}
      renderForm={(d, setD) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <input
              className="border p-2 w-full rounded"
              value={d.firstName}
              onChange={(e) => setD({ ...d, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <input
              className="border p-2 w-full rounded"
              value={d.lastName}
              onChange={(e) => setD({ ...d, lastName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <input
              className="border p-2 w-full rounded"
              value={d.phoneNumber}
              onChange={(e) => setD({ ...d, phoneNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Contact Preference
            </label>
            <select
              className="border p-2 w-full rounded"
              value={d.contactPrefrence}
              onChange={(e) =>
                setD({
                  ...d,
                  contactPrefrence: e.target.value as "call" | "text",
                })
              }
            >
              <option value="call">Call</option>
              <option value="text">Text</option>
            </select>
          </div>
        </div>
      )}
    />
  );
}

export default StudentInfoChipDetails;
