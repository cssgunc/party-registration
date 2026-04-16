"use client";

import RegistrationTracker from "@/app/student/_components/RegistrationTracker";
import StatusComponent from "@/app/student/_components/StatusComponent";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import { isFromThisSchoolYear } from "@/lib/utils";
import { Info } from "lucide-react";
import Link from "next/link";
import PartyRegistrationInfo from "./_components/PartyRegistrationInfo";
import PartySmartInfo from "./_components/PartySmartInfo";

export default function StudentDashboard() {
  const studentQuery = useCurrentStudent();
  const validResidence = isFromThisSchoolYear(
    studentQuery?.data?.residence?.residence_chosen_date
  );

  return (
    <div className="flex flex-col items-center pt-6">
      <div className="px-4 sm:px-8 flex flex-col 2xl:flex-row gap-4 max-w-4xl w-full 2xl:max-w-11/12 2xl:gap-24 h-fit">
        <div className="2xl:w-1/2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="page-title w-1/2">Events</h1>
              <div className="content text-wrap text-end w-1/2">
                {validResidence && (
                  <div className="flex justify-end">
                    <p>
                      {studentQuery?.data?.residence?.location.street_number}{" "}
                      {studentQuery?.data?.residence?.location.street_name}{" "}
                      {studentQuery?.data?.residence?.location.unit}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <RegistrationTracker />
          </div>

          <div className="mt-8">
            <h2 className="page-title mb-2">Party Smart Course </h2>
            <Link
              href="/student/about-party-registration"
              className="content flex items-center mb-2 2xl:hidden"
            >
              <Info className="h-4 w-4 inline-block mr-1" />
              <p className="underline">Learn About Party Registration</p>
            </Link>
            <StatusComponent
              last_registered={studentQuery.data?.last_registered}
              {...studentQuery}
            />
          </div>
        </div>

        <div className="hidden 2xl:flex 2xl:flex-col 2xl:w-1/2 2xl:justify-between">
          <PartyRegistrationInfo />
          <PartySmartInfo />
        </div>
      </div>
    </div>
  );
}
