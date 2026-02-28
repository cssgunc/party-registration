"use client";

import Header from "@/app/student/_components/Header";
import StudentInfo from "@/app/student/_components/StudentInfo";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8 text-red-600">
            Error loading student data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center lg:flex lg:flex-col min-h-screen">
      <Header />
      <div className="mt-12 px-14 pb-12 gap-4 max-w-4xl w-full flex justify-center">
        <Card className="mb-12 max-w-4xl w-full">
          <CardContent>
            {student && <StudentInfo initialData={student} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
