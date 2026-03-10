"use client";

import Header from "@/app/student/_components/Header";
import RegistrationTracker from "@/app/student/_components/RegistrationTracker";
import StatusComponent from "@/app/student/_components/StatusComponent";
import { Button } from "@/components/ui/button";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import { LOCATIONS } from "@/lib/mockData";
import { isFromThisSchoolYear } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import PartyRegistrationInfo from "./_components/PartyRegistrationInfo";
import PartySmartInfo from "./_components/PartySmartInfo";
import { Info } from "lucide-react";

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
  // Get mock incidents from first location with incidents
  const mockIncidents = useMemo(() => {
    const locationWithIncidents = LOCATIONS.find(
      (loc) => loc.incidents.length > 0
    );
    return locationWithIncidents?.incidents || [];
  }, []);
  const courseCompleted = isFromThisSchoolYear(
    studentQuery.data?.last_registered
  );
  const validResidence = isFromThisSchoolYear(
    studentQuery?.data?.residence?.residence_chosen_date
  );
  return (
    <div className="flex flex-col items-center">
      <Header />

      <div className="px-14 md:px-12 pb-12 pt-6 flex flex-col 2xl:flex-row gap-4 max-w-4xl w-full 2xl:max-w-11/12 2xl:gap-24">
        <div className="2xl:w-1/2">
          <div>
            <div className="flex justify-between items-center">
            <h1 className="page-title w-1/2">Events</h1>
            <div className="content text-wrap text-endw-1/2">
              {validResidence && (
                <div>
                  {studentQuery?.data?.residence?.location.street_number}{" "}
                  {studentQuery?.data?.residence?.location.street_name}{" "}
                  {studentQuery?.data?.residence?.location.unit}
                </div>
              )}
            </div>
            
            </div>
            <div className="flex justify-end mt-2">
           {courseCompleted ? (
            <Link href="/student/new-party">
              <Button className="px-4 py-2">
                Registration Form
              </Button>
            </Link>
          ) : (
            <Button
              className="px-4 py-2"
              disabled
              title="Complete the Party Smart Course to register a party"
            >
              Registration Form
            </Button>
          )}
          </div>
        </div>

          <RegistrationTracker
            data={partiesQuery.data}
            incidents={mockIncidents}
            isPending={partiesQuery.isPending}
            error={partiesQuery.error}
          />
          <div className="mt-6">
            <h2 className="page-title mb-2">Party Smart Course </h2>
            <Link href="/student/about-party-smart" className="content flex items-center mb-2">
              <Info className="h-4 w-4 inline-block mr-1" />
              <p className="underline">Learn About Party Smart</p>
            </Link>
            <StatusComponent
              last_registered={studentQuery.data?.last_registered}
              isPending={studentQuery.isPending}
              error={studentQuery.error}
            />
          </div>
         
        </div>

        <div className="hidden 2xl:flex 2xl:flex-col 2xl:w-1/2">
            <PartyRegistrationInfo />
            <PartySmartInfo />
        </div>
      </div>
    </div>
  );
}
