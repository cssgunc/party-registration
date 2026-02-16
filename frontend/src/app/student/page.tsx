"use client";

import Header from "@/app/student/_components/Header";
import RegistrationTracker from "@/app/student/_components/RegistrationTracker";
import StatusComponent from "@/app/student/_components/StatusComponent";
import { Button } from "@/components/ui/button";
import { PARTIES } from "@/lib/mockData";
import Link from "next/link";

export default function StudentDashboard() {
  // const studentQuery = useCurrentStudent();
  // const partiesQuery = useMyParties();

  // const courseCompleted = isCourseCompleted(studentQuery.data?.last_registered);
  const courseCompleted = true;

  return (
    <div className="flex flex-col">
      <Header />

      <div className="px-14 lg:px-48 pb-12 pt-6 flex flex-col gap-4 max-w-4xl mx-auto w-full">
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

        <RegistrationTracker
          data={PARTIES.filter((p) => p.contact_one.id === 35)}
        />
        <div className="text-[24px] font-semibold">Party Smart Course </div>
        {/* <StatusComponent
          last_registered={studentQuery.data?.last_registered}
          {...studentQuery}
        /> */}
        <StatusComponent last_registered={new Date("2026-01-01")} />
      </div>
    </div>
  );
}
