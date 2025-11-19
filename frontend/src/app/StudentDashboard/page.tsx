import OCSLLogo from "@/components/icons/OCSL_logo.svg";
import pfp from "@/components/icons/pfp_temp.svg";
import RegistrationTracker from "@/components/RegistrationTracker";
import StatusComponent from "@/components/StatusComponent";
import { PARTIES } from "@/lib/mockData";
import Image from "next/image";
import Link from "next/link";
export default function StudentDashboard() {
    return (
        <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
            <div className="bg-[#6FB2DC] h-20 w-full flex justify-between items-center">
                <Image src={OCSLLogo} alt="OCSL logo" className="pl-4 pt-7" />
                <Image src={pfp} alt="pfp" className="pr-4 pt-6" width={60} height={60} />
            </div>

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