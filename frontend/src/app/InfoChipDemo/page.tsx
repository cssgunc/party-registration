"use client";

import { GenericInfoChip } from "@/components/GenericInfoChip";
import LocationInfoChipDetails from "@/components/LocationInfoChipDetails";
import { useSidebar } from "@/components/SidebarContext";
import StudentInfoChipDetails from "@/components/StudentInfoChipDetails";
import { Location } from "@/types/api/location";
import { Student } from "@/types/api/student";

const Page = () => {
  const { openSidebar } = useSidebar();
  const { student: defaultStudent, location: defaultLocation } =
    getTestChipData();

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Info Chip Demo Page</h1>

      <h2 className="text-2xl font-bold mb-4">Test Sidebar</h2>
      <button
        className="bg-gray-200 px-3 py-1 rounded mb-6"
        onClick={() =>
          openSidebar("test-sidebar", <div>Hello from Sidebar!</div>)
        }
      >
        Open Sidebar
      </button>

      <h2 className="text-2xl font-bold mb-4">Student Info Chip</h2>
      <GenericInfoChip
        chipKey="student-1"
        shortName={`${defaultStudent.firstName} ${defaultStudent.lastName}`}
        sidebarContent={<StudentInfoChipDetails data={defaultStudent} />}
      />

      <h2 className="text-2xl font-bold mt-6 mb-4">Location Info Chip</h2>
      <GenericInfoChip
        chipKey="location-1"
        shortName={defaultLocation.formattedAddress}
        sidebarContent={<LocationInfoChipDetails data={defaultLocation} />}
      />
    </div>
  );
};

export function getTestChipData() {
  const student: Student = {
    id: 1,
    firstName: "Mr",
    lastName: "Beast",
    contactPreference: "text",
    email: "email@email.unc.edu",
    pid: "123456789",
    lastRegistered: new Date("2023-08-15"),
    phoneNumber: "555-1234",
  };

  const location: Location = {
    id: 1,
    warningCount: 2,
    citationCount: 1,
    hasActiveHold: true,
    holdExpirationDate: new Date("2025-12-31"),
    googlePlaceId: "abcd1234",
    formattedAddress: "123 Main St, Chapel Hill, NC",
    latitude: 35.9132,
    longitude: -79.0558,
    streetNumber: "123",
    streetName: "Main St",
    unit: "Apt 4",
    city: "Chapel Hill",
    county: "Orange",
    state: "NC",
    country: "USA",
    zipCode: "27514",
  };

  return { student, location };
}

export default Page;
