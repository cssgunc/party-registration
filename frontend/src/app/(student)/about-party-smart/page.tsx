import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PartySmartInfo from "../_components/info/PartySmartInfo";

/**
 * Full-page view of the Party Smart responsible-hosting guidelines, accessible
 * from the new-party form for students who want to review the tips before
 * registering.
 */
export default function AboutPartySmart() {
  return (
    <div className="flex flex-col items-center h-full">
      <div className="px-4 py-4 w-full max-w-4xl flex flex-col h-full min-h-0">
        <div className="flex items-center content">
          <ArrowLeft className="h-4" />
          <Link href="/new-party">Back</Link>
        </div>
        <div className="mx-0 sm:mx-8 flex-1 min-h-0 flex flex-col">
          <PartySmartInfo className="mt-4" />
        </div>
      </div>
    </div>
  );
}
