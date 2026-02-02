"use client";
import Header from "@/app/student/_components/Header";
import PartyRegistrationForm, {
  PartyFormInitialValues,
  PartyFormValues,
} from "@/app/student/_components/PartyRegistrationForm";
import { LocationService } from "@/lib/api/location/location.service";
import { useCreateParty } from "@/lib/api/party/party.queries";
import { StudentCreatePartyDto } from "@/lib/api/party/party.types";
import { useMyParties } from "@/lib/api/student/student.queries";
import getMockClient from "@/lib/network/mockClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function RegistrationForm() {
  const createPartyMutation = useCreateParty();
  const partiesQuery = useMyParties();
  const router = useRouter();

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
      <Header />
      <div className="px-125 pb-8">
        <Link className="py-8" href="/student">
          Back
        </Link>
        <div className="font-semibold py-3 text-2xl max-w-md">
          Off Campus Student Life Party Registration Form
        </div>
        <PartyRegistrationForm
          onSubmit={handleSubmit}
          locationService={new LocationService(getMockClient("student"))}
          initialValues={initialValues}
        />
      </div>
    </div>
  );
}
