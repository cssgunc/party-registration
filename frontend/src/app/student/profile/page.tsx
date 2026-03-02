"use client";

import Header from "@/app/student/_components/Header";
import StudentInfo from "@/app/student/_components/StudentInfo";
import { useCurrentStudent } from "@/lib/api/student/student.queries";

export default function StudentProfilePage() {
  const { data: student, isLoading, error } = useCurrentStudent();
  // mocking
  if (student) {
    student.residence = {
      location: {
        google_place_id: "ChIJqWQcpuXCrIkRqI-BGFaaqLw",
        formatted_address: "408 Pittsboro St, Chapel Hill, NC 27516, USA",
        latitude: 35.9059464,
        longitude: -79.0553058,
        street_number: "408",
        street_name: "Pittsboro Street",
        unit: null,
        city: "Chapel Hill",
        county: "Orange County",
        state: "NC",
        country: "US",
        zip_code: "27516",
        hold_expiration: null,
        id: 1,
        incidents: [],
      },
      residence_chosen_date: new Date(),
    };
  }

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8 text-red-600">
            Error loading student data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex lg:flex-col">
      <Header />
      <div className="sm:px-14 pb-12 gap-4 max-w-4xl mx-auto w-full flex justify-center">
        <div className="w-full lg:self-center">
          {student && <StudentInfo initialData={student} />}
        </div>
      </div>
    </div>
  );
}
