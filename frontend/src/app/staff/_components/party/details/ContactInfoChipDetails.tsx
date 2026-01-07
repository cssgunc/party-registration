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
      title={"Info about the Contact"}
      description={"View information on the Contact you just clicked on"}
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
            <label className="block text-sm font-medium">Email</label>
            <p className="p-2 border rounded">{d.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <p className="p-2 border rounded">{d.phone_number}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Contact Preference
            </label>
            <p className="p-2 border rounded">{d.contact_preference}</p>
          </div>
        </div>
      )}
    />
  );
}

export default ContactInfoChipDetails;
