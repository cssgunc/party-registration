"use client";

import Header from "@/components/Header";
import RegistrationTracker from "@/components/RegistrationTracker";
import StatusComponent from "@/components/StatusComponent";
import { useCurrentStudent, useMyParties } from "@/hooks/useStudent";
import Link from "next/link";

export default function StudentDashboard() {
    const { data: student } = useCurrentStudent();
    const { data: parties } = useMyParties();

    return (
        <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
            <Header />

            <div className="flex justify-between items-center">
                <div className="font-semibold text-2xl">Events</div>

                <Link href="/student/form">
                    <button className="px-4 py-2 rounded-lg bg-[#09294E] text-white">
                        Registration Form
                    </button>
                </Link>
            </div>

            <RegistrationTracker parties={parties || []} />
            <div className="text-[24px] font-semibold">Party Smart Course </div>
            <StatusComponent completion_date={student?.lastRegistered?.toISOString() || null} expiration_date={null} />
        </div>

    );
}
