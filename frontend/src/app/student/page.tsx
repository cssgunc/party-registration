"use client";

import Header from "@/app/student/_components/Header";
import RegistrationTracker from "@/app/student/_components/RegistrationTracker";
import StatusComponent from "@/app/student/_components/StatusComponent";
import { Button } from "@/components/ui/button";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import Link from "next/link";

export default function StudentDashboard() {
  const studentQuery = useCurrentStudent();
  const partiesQuery = useMyParties();

  return (
    <div className="flex flex-col">
      <Header />

      <div className="px-48 pb-12 pt-6 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-2xl">Events</div>

          <Link href="/student/form">
            <Button className="px-4 py-2 rounded-lg bg-[#09294E] text-white">
              Registration Form
            </Button>
          </Link>
        </div>

        <RegistrationTracker {...partiesQuery} />
        <div className="text-[24px] font-semibold">Party Smart Course </div>
        <StatusComponent
          lastRegistered={studentQuery.data?.lastRegistered}
          {...studentQuery}
        />
      </div>
    </div>
  );
}
