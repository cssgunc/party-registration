"use client";

import { Contact } from "@/lib/api/student/student.types";
import { GenericChipDetails } from "../../shared/sidebar/GenericChipDetails";

interface ContactInfoChipDetailsProps {
  data: Contact;
}

export function ContactInfoChipDetails({ data }: ContactInfoChipDetailsProps) {
  return (
    <GenericChipDetails<Contact>
      data={data}
      title={"Info about the Contact"}
      description={"View information on the Contact you just clicked on"}
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
            <label className="block text-sm font-medium">Email</label>
            <p className="p-2 border rounded">{d.email}</p>
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

export default ContactInfoChipDetails;
