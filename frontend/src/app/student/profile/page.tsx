"use client";

import StudentInfo from "@/app/student/_components/StudentInfo";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import { STUDENTS } from "@/lib/mockData";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <Link className="py-8" href="/student">
            Back
          </Link>
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8 text-red-600">
            Error loading student data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center lg:flex lg:flex-col min-h-screen">
      <main className="w-5/6 mx-4 my-4 max-w-2xl flex flex-col">
        <div className="flex items-center">
          <ArrowLeft className="h-4" />
          <Link href="/student">Back</Link>
        </div>
        <Card className="max-w-4xl mt-2 w-full border">
          <CardContent>
            {student && <StudentInfo initialData={student} />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
