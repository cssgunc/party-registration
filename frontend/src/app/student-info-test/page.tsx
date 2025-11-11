"use client";

import StudentInfo from "@/components/StudentInfo";

export default function StudentInfoTestPage() {
  const handleSubmit = async (data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    contactPreference: "call" | "text";
  }) => {
    console.log("Submitted student info:", data);
    // In a real app, this would make an API call
    alert(`Student info submitted:\n${JSON.stringify(data, null, 2)}`);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Info Test</h1>
      <div className="max-w-2xl">
        <StudentInfo
          initialData={{
            firstName: "John",
            lastName: "Doe",
            phoneNumber: "(919) 123-4567",
            contactPreference: "call",
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
