import RegistrationTracker from "@/components/RegistrationTracker";
import StatusComponent from "@/components/StatusComponent";
import { PARTIES } from "@/lib/mockData";
import Link from "next/link";
export default function StudentDashboard() {
    return (
        <div className="px-20 py-2 flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="bg-stone-800 h-16 w-full"></div>

            <div className="flex justify-between items-center">
                <div className="font-semibold text-2xl">Events</div>

                <Link href="/RegistrationForm">
                    <button className="px-4 py-2 rounded-lg bg-black text-white">
                        Registration Form
                    </button>
                </Link>
            </div>

            <RegistrationTracker parties={PARTIES.filter(party => party.contactOne.id === 4)} />
            <div>Party Smart Course </div>
            <StatusComponent completion_date={null} expiration_date={null} />
        </div>

    );
}