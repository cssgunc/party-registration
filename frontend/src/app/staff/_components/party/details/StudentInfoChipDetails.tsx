"use client";

import { StudentDto } from "@/lib/api/student/student.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface StudentInfoChipDetailsProps {
  data: StudentDto;
}

export function StudentInfoChipDetails({ data }: StudentInfoChipDetailsProps) {
  return (
    <GenericChipDetails<StudentDto>
      data={data}
      title={"Info about the Student"}
      description={"View information on the Student you just clicked on"}
      renderView={(d) => (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <p className="p-2 border rounded">{d.first_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p className="p-2 border rounded">{d.last_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <p className="p-2 border rounded">{d.phone_number}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Contact Preference
            </label>
            <p className="p-2 border rounded">
              {d.contact_preference.charAt(0).toUpperCase() +
                d.contact_preference.slice(1)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">PID</label>
            <p className="p-2 border rounded">{d.pid}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Onyen</label>
            <p className="p-2 border rounded">{d.onyen}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <p className="p-2 border rounded">{d.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Completed Party Smart
            </label>
            <p className="p-2 border rounded">
              {d.last_registered != null ? "Yes" : "Not Registered"}
            </p>
          </div>
        </div>
      )}
    />
  );
}

export default StudentInfoChipDetails;
