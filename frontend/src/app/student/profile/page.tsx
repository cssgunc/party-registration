"use client";

import Header from "@/app/student/_components/Header";
import StudentInfo from "@/app/student/_components/StudentInfo";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import { STUDENTS } from "@/lib/mockData";

export default function StudentProfilePage() {
  // const { data: student, isLoading, error } = useCurrentStudent();
  const isLoading = false;
  const error = null;
  const student = STUDENTS.filter((s) => 35 === s.id)[0];

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8 text-red-600">
            Error loading student data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex lg:flex-col">
      <Header />
      <div className="px-14 pb-12 gap-4 max-w-4xl mx-auto w-full flex justify-center">
        <div className="w-full lg:self-center">
          {student && <StudentInfo initialData={student} />}
        </div>
      </div>
    </div>
  );
}
