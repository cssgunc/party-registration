"use client";
import PartyRegistrationForm, {
  PartyFormInitialValues,
  PartyFormValues,
} from "@/app/student/_components/PartyRegistrationForm";
import { Card } from "@/components/ui/card";
import { LocationService } from "@/lib/api/location/location.service";
import { useCreateParty } from "@/lib/api/party/party.queries";
import { StudentCreatePartyDto } from "@/lib/api/party/party.types";
import {
  useCurrentStudent,
  useMyParties,
} from "@/lib/api/student/student.queries";
import getMockClient from "@/lib/network/mockClient";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function RegistrationForm() {
  const createPartyMutation = useCreateParty();
  const partiesQuery = useMyParties();
  const studentQuery = useCurrentStudent();
  const router = useRouter();
  // mocking
  if (studentQuery?.data) {
    studentQuery.data.residence = {
      location: {
        google_place_id: "ChIJqWQcpuXCrIkRqI-BGFaaqLw",
        formatted_address: "408 Pittsboro St, Chapel Hill, NC 27516, USA",
        latitude: 35.9059464,
        longitude: -79.0553058,
        street_number: "408",
        street_name: "Pittsboro Street",
        unit: null,
        city: "Chapel Hill",
        county: "Orange County",
        state: "NC",
        country: "US",
        zip_code: "27516",
        hold_expiration: null,
        id: 1,
        incidents: [],
      },
      residence_chosen_date: new Date(2022, 5, 6),
    };
  }

  /**
   * Get initial values from the student's most recent party (if they have one).
   * Prefills second contact information to save time for repeat registrations.
   */
  const initialValues: PartyFormInitialValues | undefined = useMemo(() => {
    if (!partiesQuery.data || partiesQuery.data.length === 0) {
      return undefined;
    }

    // Sort parties by date (most recent first) and get the latest
    const sortedParties = [...partiesQuery.data].sort(
      (a, b) =>
        new Date(b.party_datetime).getTime() -
        new Date(a.party_datetime).getTime()
    );
    const lastParty = sortedParties[0];

    if (!lastParty.contact_two) {
      return undefined;
    }

    return {
      address: lastParty.location.formatted_address,
      placeId: lastParty.location.google_place_id,
      secondContactFirstName: lastParty.contact_two.first_name,
      secondContactLastName: lastParty.contact_two.last_name,
      phoneNumber: lastParty.contact_two.phone_number,
      contactPreference: lastParty.contact_two.contact_preference,
      contactTwoEmail: lastParty.contact_two.email,
    };
  }, [partiesQuery.data]);

  const formToData = (
    values: PartyFormValues,
    placeId: string
  ): StudentCreatePartyDto => {
    const [hours, minutes] = values.partyTime.split(":");
    const partyDateTime = new Date(values.partyDate);
    partyDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    return {
      type: "student",
      party_datetime: partyDateTime,
      google_place_id: placeId,
      contact_two: {
        email: values.contactTwoEmail,
        first_name: values.secondContactFirstName,
        last_name: values.secondContactLastName,
        // Strip non-digit characters from phone number before sending to backend
        phone_number: values.phoneNumber.replace(/\D/g, ""),
        contact_preference: values.contactPreference,
      },
    };
  };

  const handleSubmit = async (values: PartyFormValues, placeId: string) => {
    try {
      const partyData = formToData(values, placeId);
      await createPartyMutation.mutateAsync(partyData);
      alert("Party created successfully!");
      router.push("/student");
    } catch (err) {
      console.log(err);
      alert("Failed to create party");
    }
  };

  return (
    <div>
      <main className="mx-4 mt-4">
        <div className="flex items-center content pb-2 lg:hidden">
          <ArrowLeft className="h-4" />
          <Link href="/student">Back</Link>
        </div>
        <Card className="mb-12">
          <div>
            <div className="hidden content lg:flex lg:items-center lg:px-8 lg:py-6">
              <ArrowLeft className="h-4" />
              <Link href="/student">Back</Link>
            </div>
            <div className="px-8 py-6 lg:px-24 lg:py-0 lg:pb-12">
              <h1 className="page-title max-w-md">
                Off Campus Student Life Party Registration Form
              </h1>

              <Link
                href="/student/about-party-registration"
                className="flex items-center py-2 lg:hidden"
              >
                <Info className="h-4 mr-1 content" />
                <p className="content underline">
                  Learn About Party Registration
                </p>
              </Link>

              <PartyRegistrationForm
                onSubmit={handleSubmit}
                locationService={new LocationService(getMockClient("student"))}
                initialValues={initialValues}
                studentEmail={studentQuery.data?.email}
                studentPhoneNumber={studentQuery.data?.phone_number}
                studentResidence={studentQuery.data?.residence}
              />
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
