"use client";

import { GenericChipDetails } from "@/components/GenericChipDetails";
import { GenericInfoChip } from "@/components/GenericInfoChip";
import LocationInfoChipDetails from "@/components/LocationInfoChipDetails";
import { useSidebar } from "@/components/SidebarContext";
import StudentInfoChipDetails from "@/components/StudentInfoChipDetails";
import { Location } from "@/types/api/location";
import { Student } from "@/types/api/student";
import { Badge } from "lucide-react";
import { useState } from "react";

const Page = () => {
  const { openSidebar } = useSidebar();
  const defaultStudent = getTestChipData().student;
  const defaultLocation = getTestChipData().location;
  const [exampleData, setExampleData] = useState({ name: "Mason", age: 22 });
  const [studentData, setStudentData] = useState(defaultStudent);
  const [locationData, setLocationData] = useState(defaultLocation);

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Info Chip Demo Page</h1>
      <h1 className="text-2xl font-bold mb-4">Test Sidebar</h1>
      <Badge onClick={() => openSidebar(<div>Hello from Sidebar!</div>)}>
        Open Sidebar
      </Badge>
      <h1 className="text-2xl font-bold mb-4">Example Info Chip</h1>
      <GenericInfoChip
        data={{ name: "Mason", age: 22 }}
        renderSidebar={(data, onSave) => (
          <GenericChipDetails
            data={data}
            onSave={(updated) => {
              setExampleData(updated);
              onSave(updated);
            }}
            renderForm={(d, setD) => (
              <input
                className="border p-2 w-full"
                value={d.name}
                onChange={(e) => setD({ ...d, name: e.target.value })}
              />
            )}
          />
        )}
      />
      <div className="mt-4 space-y-2">
        <h2 className="font-semibold text-xl">Example Info</h2>
        <p>Age: {exampleData.age}</p>
        <p>Name: {exampleData.name}</p>
      </div>
      <h1 className="text-2xl font-bold mb-4">Student Info Chip</h1>
      <GenericInfoChip
        data={studentData}
        renderSidebar={(data, onSave) => (
          <StudentInfoChipDetails
            data={data}
            onSave={(updated) => {
              setStudentData(updated);
              onSave(updated);
            }}
          />
        )}
      />
      <div className="mt-4 space-y-2">
        <h2 className="font-semibold text-xl">Student Info</h2>
        <p>
          Name: {studentData.firstName} {studentData.lastName}
        </p>
        <p>Phone: {studentData.phoneNumber}</p>
        <p>Contact Pref: {studentData.contactPrefrence}</p>
      </div>
      <h1 className="text-2xl font-bold mb-4">Location Info Chip</h1>
      <GenericInfoChip
        data={locationData}
        renderSidebar={(data, onSave) => (
          <LocationInfoChipDetails
            data={data}
            onSave={(updated) => {
              setLocationData(updated);
              onSave(updated);
            }}
          />
        )}
      />
      <div className="mt-4 space-y-2">
        <h2 className="font-semibold text-xl">Location Info</h2>
        <p>Address: {locationData.formatted_address}</p>
        <p>Active Hold: {locationData.has_active_hold ? "Yes" : "No"}</p>
        <p>Warnings: {locationData.warning_count}</p>
        <p>Citations: {locationData.citation_count}</p>
      </div>
    </div>
  );
};
export function getTestChipData() {
  const student: Student = {
    id: 1,
    accountId: 101,
    firstName: "Mason",
    lastName: "Beast",
    fullName: "Mason Beast",
    contactPrefrence: "text",
    registerDate: new Date("2025-01-01"),
    phoneNumber: "555-1234",
  };

  const location: Location = {
    id: 1,
    warning_count: 2,
    citation_count: 1,
    has_active_hold: true,
    hold_expiration: new Date("2025-12-31"),
    google_place_id: "abcd1234",
    formatted_address: "123 Main St, Chapel Hill, NC",
    latitude: 35.9132,
    longitude: -79.0558,
    street_number: "123",
    street_name: "Main St",
    unit: "Apt 4",
    city: "Chapel Hill",
    county: "Orange",
    state: "NC",
    country: "USA",
    zip_code: "27514",
  };
  return { student, location };
}

export default Page;
