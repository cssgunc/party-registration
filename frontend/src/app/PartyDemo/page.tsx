"use client";

import EmbeddedMap from "@/components/EmbeddedMap";
import PartyList from "@/components/PartyList";
import { PARTIES } from "@/lib/mockData";

const Page = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const testParties = PARTIES.filter((p) => {
    const partyDate = new Date(p.datetime);
    partyDate.setHours(0, 0, 0, 0);
    return partyDate.getTime() === today.getTime();
  });
  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <PartyList parties={testParties}/>
      <EmbeddedMap parties={testParties} />
    </div>
  );
};

export default Page;
