"use client";

import Header from "@/components/Header";
import StudentInfo from "@/components/StudentInfo";
import { STUDENTS } from "@/lib/mockData";

export default function StudentProfilePage() {
  return (
    <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
      <Header />

      <StudentInfo initialData={STUDENTS[0]} />
    </div>
  );
}
