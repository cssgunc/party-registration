"use client";

import { ContactDto } from "@/lib/api/party/party.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface ContactInfoChipDetailsProps {
  data: ContactDto;
}

export function ContactInfoChipDetails({ data }: ContactInfoChipDetailsProps) {
  return (
    <GenericChipDetails<ContactDto>
      data={data}
      renderView={(d) => (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium">First Name</label>
            <p>{d.first_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Last Name</label>
            <p>{d.last_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <p>{d.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <p>{d.phone_number}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Contact Preference
            </label>
            <p>{d.contact_preference}</p>
          </div>
        </div>
      )}
    />
  );
}

export default ContactInfoChipDetails;
