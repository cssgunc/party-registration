"use client";

import Header from "@/app/student/_components/Header";
import StudentInfo from "@/app/student/_components/StudentInfo";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentStudent } from "@/lib/api/student/student.queries";
import { STUDENTS } from "@/lib/mockData";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudentProfilePage() {
  const { data: student, isLoading, error } = useCurrentStudent();

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="sm:px-14 pb-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <Link className="py-8" href="/student">
          Back
        </Link>
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
      <main className="w-5/6 mx-4 my-4 max-w-2xl flex flex-col">
        <div className="flex items-center">
          <ArrowLeft className="h-4" />
          <Link href="/student">
             Back
          </Link>
        </div>
        <Card className="max-w-4xl mt-2 w-full border">
          <CardContent>
            {student && <StudentInfo initialData={student} />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
