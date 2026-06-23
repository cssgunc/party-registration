import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PartyRegistrationInfo from "../_components/info/PartyRegistrationInfo";

/**
 * Full-page view of the party registration informational content, accessible
 * via the mobile "Learn About Party Registration" link on the dashboard.
 */
export default function AboutPartyRegistration() {
  return (
    <div className="flex flex-col items-center">
      <div className="mx-4 mt-4 max-w-4xl">
        <nav className="flex items-center content">
          <ArrowLeft className="h-4" />
          <Link href="/">Back</Link>
        </nav>
        <div className="mx-8">
          <PartyRegistrationInfo className="mt-4" />
        </div>
      </div>
    </div>
  );
}
