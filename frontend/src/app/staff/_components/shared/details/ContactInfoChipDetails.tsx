"use client";

import { InfoChipDetails } from "@/app/staff/_components/shared/sidebar/InfoChipDetails";
import { ContactDto } from "@/lib/api/party/party.types";
import { formatContactPreference, formatPhoneNumber } from "@/lib/utils";

interface ContactInfoChipDetailsProps {
  data: ContactDto;
}

export function ContactInfoChipDetails({ data }: ContactInfoChipDetailsProps) {
  return (
    <InfoChipDetails
      fields={[
        ["First Name", data.first_name],
        ["Last Name", data.last_name],
        ["Email", data.email],
        ["Phone Number", formatPhoneNumber(data.phone_number)],
        [
          "Contact Preference",
          formatContactPreference(data.contact_preference),
        ],
      ]}
    />
  );
}

export default ContactInfoChipDetails;
