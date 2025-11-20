import Header from "@/components/Header";
import RegistrationTracker from "@/components/RegistrationTracker";
import StatusComponent from "@/components/StatusComponent";
import { PARTIES } from "@/lib/mockData";
import Link from "next/link";
export default function StudentDashboard() {
    return (
        <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
            <Header />

            <div className="flex justify-between items-center">
                <div className="font-semibold text-2xl">Events</div>

                <Link href="/RegistrationForm">
                    <button className="px-4 py-2 rounded-lg bg-[#09294E] text-white">
                        Registration Form
                    </button>
                </Link>
            </div>

            <RegistrationTracker parties={PARTIES.filter(party => party.contactOne.id === 4)} />
            <div className="text-[24px] font-semibold">Party Smart Course </div>
            <StatusComponent completion_date={null} expiration_date={null} />
        </div>

    );
}
