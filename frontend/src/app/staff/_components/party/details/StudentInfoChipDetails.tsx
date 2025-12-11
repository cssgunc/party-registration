"use client";

import { Student } from "@/lib/api/student/student.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

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
          <div>
            <label className="block text-sm font-medium">PID</label>
            <p className="p-2 border rounded">{d.pid}</p>
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
              {d.lastRegistered != null ? "Yes" : "Not Registered"}
            </p>
          </div>
        </div>
      )}
    />
  );
}

export default StudentInfoChipDetails;
