"use client";
import PartyList from "@/components/PartyList";
import { LOCATIONS, PARTIES, STUDENTS } from "@/lib/mockData";
import { LocationTable } from "../../components/LocationTable";
import { PartyTable } from "../../components/PartyTable";
import { StudentTable } from "../../components/StudentTable";

export default function Home() {
  return (
    <div className="p-8 px-24">
      <div>
        <PartyList parties={PARTIES}></PartyList>
      </div>
      <PartyTable data={PARTIES} />

      <StudentTable data={STUDENTS} />

      <LocationTable data={LOCATIONS} />
    </div>
  );
}
