import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PartyRegistrationInfo from "../_components/PartyRegistrationInfo";

export default function AboutPartyRegistration() {
  return (
    <div className="flex flex-col items-center">
      <main className="mx-4 mt-4 max-w-4xl">
        <nav className="flex items-center content">
          <ArrowLeft className="h-4" />
          <Link href="/student">Back</Link>
        </nav>
        <div className="mx-8">
          <PartyRegistrationInfo />
        </div>
      </main>
    </div>
  );
}
