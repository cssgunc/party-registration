"use client";

import EmbeddedMap from "@/components/EmbeddedMap";
import PartyList from "@/components/PartyList";

const Page = () => {
  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <PartyList />
      <EmbeddedMap parties={[]} />
    </div>
  );
};

export default Page;
