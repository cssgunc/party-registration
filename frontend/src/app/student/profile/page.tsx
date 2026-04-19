"use client";

import StudentInfo from "@/app/student/_components/StudentInfo";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentStudent } from "@/lib/api/student/student.queries";

export default function StudentProfilePage() {
  const { data: student, isLoading, error } = useCurrentStudent();

  if (isLoading) {
    return (
      <div>
        <div className="sm:px-14 pb-12 my-4 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8 content">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="sm:px-14 pb-12 my-4 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-8 text-red-600">
            Error loading student data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center lg:flex lg:flex-col min-h-screen">
      <main className="w-5/6 mx-4 my-4 max-w-2xl flex flex-col">
        <Card className="max-w-4xl mt-2 w-full border">
          <CardContent>
            {student && <StudentInfo initialData={student} />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
