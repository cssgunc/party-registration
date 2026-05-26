"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { StudentDto } from "@/lib/api/student/student.types";
import {
  formatContactPreference,
  formatPhoneNumber,
  isFromThisSchoolYear,
} from "@/lib/utils";

interface StudentInfoChipDetailsProps {
  data: StudentDto;
}

export function StudentInfoChipDetails({ data }: StudentInfoChipDetailsProps) {
  return (
    <InfoChipDetails
      fields={[
        ["First Name", data.first_name],
        ["Last Name", data.last_name],
        [
          "Phone Number",
          data.phone_number ? formatPhoneNumber(data.phone_number) : "—",
        ],
        [
          "Contact Preference",
          formatContactPreference(data.contact_preference),
        ],
        ["PID", data.pid],
        ["Onyen", data.onyen],
        ["Email", data.email],
        [
          "Residence",
          data.residence &&
          isFromThisSchoolYear(data.residence.residence_chosen_date)
            ? data.residence.location.formatted_address
            : "—",
        ],
        [
          "Completed Party Smart",
          data.last_registered != null ? "Yes" : "Not Registered",
        ],
      ]}
    />
  );
}

export default StudentInfoChipDetails;
