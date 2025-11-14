"use client";

import { GenericChipDetails } from "@/components/GenericChipDetails";
import { GenericInfoChip } from "@/components/GenericInfoChip";
import LocationInfoChipDetails from "@/components/LocationInfoChipDetails";
import { useSidebar } from "@/components/SidebarContext";
import StudentInfoChipDetails from "@/components/StudentInfoChipDetails";
import { LOCATIONS, STUDENTS } from "@/lib/mockData";
import { Badge } from "lucide-react";
import { useState } from "react";

const Page = () => {
  const { openSidebar } = useSidebar();
  const [exampleData, setExampleData] = useState({ name: "Mason", age: 22 });
  const [studentData, setStudentData] = useState(STUDENTS[0]);
  const [locationData, setLocationData] = useState(LOCATIONS[0]);

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
        <p>Contact Pref: {studentData.contactPreference}</p>
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
        <p>Address: {locationData.formattedAddress}</p>
        <p>Active Hold: {locationData.hasActiveHold ? "Yes" : "No"}</p>
        <p>Warnings: {locationData.warningCount}</p>
        <p>Citations: {locationData.citationCount}</p>
      </div>
    </div>
  );
};

export default Page;
