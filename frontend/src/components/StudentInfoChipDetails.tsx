"use client";

import { Student } from "@/types/api/student";
import { GenericChipDetails } from "./GenericChipDetails";

interface StudentInfoChipDetailsProps {
  data: Student;
}

export function StudentInfoChipDetails({ data }: StudentInfoChipDetailsProps) {
  return (
    <GenericChipDetails<Student>
      data={data}
      title={"Info about the Student"}
      description={"View information on the Student you just clicked on"}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <p className="p-2 border rounded">{d.firstName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p className="p-2 border rounded">{d.lastName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <p className="p-2 border rounded">{d.phoneNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Contact Preference
            </label>
            <p className="p-2 border rounded">{d.contactPreference}</p>
          </div>
        </div>
      )}
    />
  );
}

export default StudentInfoChipDetails;
