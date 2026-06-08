"use client";

import RegistrationStatus from "@/app/(student)/_components/RegistrationStatus";
import RegistrationTracker from "@/app/(student)/_components/tracker/RegistrationTracker";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import { formatAddress, isFromThisSchoolYear } from "@/lib/utils";
import { AlertTriangleIcon, Info } from "lucide-react";
import Link from "next/link";
import PartyRegistrationInfo from "./_components/info/PartyRegistrationInfo";
import PartySmartInfo from "./_components/info/PartySmartInfo";

export default function StudentDashboard() {
  const studentQuery = useCurrentStudent();
  const isStudentLoading = studentQuery.isLoading;
  const validResidence = isFromThisSchoolYear(
    studentQuery?.data?.residence?.residence_chosen_date
  );
  const location = studentQuery?.data?.residence?.location;

  return (
    <div className="px-4 sm:px-8 pt-6 pb-6 flex flex-col md:flex-row gap-4 max-w-4xl mx-auto w-full md:max-w-11/12 md:gap-24 h-full overflow-hidden min-h-0">
      <div className="md:w-1/2 flex flex-col flex-1 md:flex-none min-h-0">
        <div className="flex items-center justify-between">
          <h1 className="page-title w-1/2">Parties</h1>
          <div className="content text-wrap text-end w-1/2">
            <div className="flex justify-end">
              {isStudentLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                validResidence && (
                  <p>
                    {formatAddress(location, [
                      "street_number",
                      "street_name",
                      "unit",
                    ])}
                  </p>
                )
              )}
            </div>
          </div>
        </div>
        <RegistrationTracker />

        <div className="mt-4 shrink-0">
          <h2 className="page-title mb-2">Registration Status </h2>
          <Link
            href="/about-party-registration"
            className="content flex items-center mb-2 md:hidden"
          >
            <Info className="size-4 inline-block mr-1" />
            <p className="underline">Learn About Party Registration</p>
          </Link>
          <RegistrationStatus
            last_registered={studentQuery.data?.last_registered}
            hold_expiration={
              studentQuery.data?.residence?.location.hold_expiration
            }
            {...studentQuery}
          />
        </div>
      </div>

      <div className="hidden md:flex md:flex-col md:w-1/2 ">
        <PartyRegistrationInfo />
        <div className="flex-1" />
        <div className="flex flex-col items-center text-center content [@media(max-height:725px)]:hidden">
          <AlertTriangleIcon />
          <p className="max-w-md mt-1">
            Keep in mind that the party registration program only pertains to
            nuisance noise complaints. Calls to 911 for other violations will
            likely result in local law enforcement showing up without a warning.
          </p>
        </div>
        <div className="flex-1" />
        <PartySmartInfo />
      </div>
    </div>
  );
}
