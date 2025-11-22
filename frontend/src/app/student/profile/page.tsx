"use client";

import Header from "@/components/Header";
import StudentInfo from "@/components/StudentInfo";
import { useCurrentStudent } from "@/hooks/useStudent";

export default function StudentProfilePage() {
  const { data: student, isLoading, error } = useCurrentStudent();

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
          <div className="text-center py-8 text-red-600">
            Error loading student data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="px-48 pb-12 flex flex-col gap-4 max-w-4xl mx-auto">
        {student && (
          <StudentInfo
            initialData={{
              firstName: student.firstName,
              lastName: student.lastName,
              phoneNumber: student.phoneNumber,
              contactPreference: student.contactPreference,
            }}
          />
        )}
      </div>
    </div>
  );
}
