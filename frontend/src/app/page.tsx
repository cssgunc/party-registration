import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Party Registration System
      </h1>
      <p className="mb-8 text-lg text-center">
        A CS+SG project for the Office of Off-Campus Student Life at UNC.
      </p>
      <div className="flex gap-4 mb-8">
        <Button asChild>
          <Link href="/student">Student</Link>
        </Button>
        <Button asChild>
          <Link href="/staff">Staff</Link>
        </Button>
        <Button asChild>
          <Link href="/police">Police</Link>
        </Button>
      </div>
      <h2 className="text-xl font-semibold mb-4 text-center">
        About the Office of Off-Campus Student Life
      </h2>
      <p className="text-base text-center">
        The Office of Off-Campus Student Life serves as a vital resource for
        students living off-campus, providing support, programs, and services to
        enhance the off-campus living experience. This office works to connect
        off-campus students with campus resources, facilitate community
        building, and ensure student safety and well-being in off-campus
        environments. Through various initiatives and programs, the office aims
        to bridge the gap between on-campus and off-campus student experiences,
        fostering a sense of belonging and engagement for all students
        regardless of their housing situation.
      </p>
    </div>
  );
}
