"use client";

import EmbeddedMap from "@/components/EmbeddedMap";
import { GenericChipDetails } from "@/components/GenericChipDetails";
import { GenericInfoChip } from "@/components/GenericInfoChip";
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
      <GenericInfoChip
        data={{ name: "Mason", age: 22 }}
        renderSidebar={(data, onSave) => (
          <GenericChipDetails
            data={data}
            onSave={onSave}
            renderForm={(d, setD) => (
              <input
                className="border p-2 w-full"
                value={d.name}
                onChange={(e) => setD({ ...d, name: e.target.value })}
              />
            )}
          />
        )}
      />
    </div>
  );
};

export default Page;
