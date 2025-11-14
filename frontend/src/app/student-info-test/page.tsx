"use client";

import StudentInfo from "@/components/StudentInfo";
import { STUDENTS } from "@/lib/mockData";

export default function StudentInfoTestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Info Test</h1>
      <div className="max-w-2xl">
        <StudentInfo id={1} initialData={STUDENTS[0]} />
      </div>
    </div>
  );
}
