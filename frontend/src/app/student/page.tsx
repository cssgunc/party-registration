"use client";

import Header from "@/app/student/_components/Header";
import RegistrationTracker from "@/app/student/_components/RegistrationTracker";
import StatusComponent from "@/app/student/_components/StatusComponent";
import { Button } from "@/components/ui/button";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import { isCourseCompleted } from "@/lib/utils";
import Link from "next/link";

export default function StudentDashboard() {
  const studentQuery = useCurrentStudent();
  const partiesQuery = useMyParties();

  const courseCompleted = isCourseCompleted(studentQuery.data?.last_registered);

  return (
    <div className="flex flex-col items-center">
      <Header />

      <div className="px-14 md:px-12 pb-12 pt-6 flex flex-col 2xl:flex-row gap-4 max-w-4xl w-full 2xl:max-w-7xl">
        <div className="2xl:w-1/2">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-2xl">Events</div>

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
          </div>

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
