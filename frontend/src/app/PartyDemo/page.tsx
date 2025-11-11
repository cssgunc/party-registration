"use client";

import EmbeddedMap from "@/components/EmbeddedMap";
import PartyList from "@/components/PartyList";
import { useSidebar } from "@/components/SidebarContext";

const Page = () => {
  const { openSidebar } = useSidebar();

  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <PartyList />
      <EmbeddedMap parties={[]} />
      <h1 className="text-3xl font-bold mb-4">Party Demo Page</h1>
      <button onClick={() => openSidebar(<div>Hello from Sidebar!</div>)}>
        Open Sidebar
      </button>
    </div>
  );
};

export default Page;
