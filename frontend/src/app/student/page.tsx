"use client";

import Header from "@/app/student/_components/Header";
import RegistrationTracker from "@/app/student/_components/RegistrationTracker";
import StatusComponent from "@/app/student/_components/StatusComponent";
import { Button } from "@/components/ui/button";
import { LocationService } from "@/lib/api/location/location.service";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import { isFromThisSchoolYear } from "@/lib/utils";
import Link from "next/link";

const locationService = new LocationService();

export default function StudentDashboard() {
  const studentQuery = useCurrentStudent();
  // mocking
  if (studentQuery?.data) {
    studentQuery.data.residence = {
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

  const partiesQuery = useMyParties();
  const courseCompleted = isFromThisSchoolYear(
    studentQuery.data?.last_registered
  );
  const validResidence = isFromThisSchoolYear(
    studentQuery?.data?.residence?.residence_chosen_date
  );
  return (
    <div className="flex flex-col items-center">
      <Header />

      <div className="px-14 md:px-12 pb-12 pt-6 flex flex-col 2xl:flex-row gap-4 max-w-4xl w-full 2xl:max-w-7xl">
        <div className="2xl:w-1/2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-2xl">Events</div>
            {validResidence && (
              <div>
                {studentQuery?.data?.residence?.location.street_number}{" "}
                {studentQuery?.data?.residence?.location.street_name}{" "}
                {studentQuery?.data?.residence?.location.unit}
              </div>
            )}
          </div>
          {courseCompleted ? (
            <Link href="/student/new-party">
              <Button className="px-4 py-2 rounded-lg bg-[#09294E] text-white">
                Registration Form
              </Button>
            </Link>
          ) : (
            <Button
              className="px-4 py-2 rounded-lg bg-[#09294E] text-white"
              disabled
              title="Complete the Party Smart Course to register a party"
            >
              Registration Form
            </Button>
          )}

          <RegistrationTracker {...partiesQuery} />
          <div className="text-[24px] font-semibold">Party Smart Course </div>
          <StatusComponent
            last_registered={studentQuery.data?.last_registered}
            {...studentQuery}
          />
        </div>
      </div>
    </div>
  );
}
