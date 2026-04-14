"use client";

import StudentInfo from "@/app/student/_components/StudentInfo";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudentProfilePage() {
  return (
    <div className="flex flex-col items-center lg:flex lg:flex-col min-h-screen">
      <main className="w-5/6 mx-4 my-4 max-w-2xl flex flex-col">
        <div className="flex items-center content">
          <ArrowLeft className="h-4" />
          <Link href="/student">Back</Link>
        </div>
        <Card className="max-w-4xl mt-2 w-full border">
          <CardContent>
            <StudentInfo />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
