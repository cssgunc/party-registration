import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PartySmartInfo from "../_components/PartySmartInfo";

export default function AboutPartySmart() {
  return (
    <div className="flex flex-col items-center">
      <main className="px-4 py-4 w-full max-w-4xl">
        <div className="flex items-center content">
          <ArrowLeft className="h-4" />
          <Link href="/student/new-party">Back</Link>
        </div>
        <div className="mx-8">
          <PartySmartInfo />
        </div>
      </main>
    </div>
  );
}
