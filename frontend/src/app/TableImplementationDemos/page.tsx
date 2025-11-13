"use client";
import { LOCATIONS, PARTIES, STUDENTS } from "@/lib/mockData";
import { LocationTable } from "../../components/LocationTable";
import { PartyTable } from "../../components/PartyTable";
import { StudentTable } from "../../components/StudentTable";

export default function Home() {
  console.log("party", PARTIES[0]);
  return (
    <div className="p-8 px-24">
      <PartyTable data={PARTIES} />

      <StudentTable data={STUDENTS} />

      <LocationTable data={LOCATIONS} />
    </div>
  );
}
