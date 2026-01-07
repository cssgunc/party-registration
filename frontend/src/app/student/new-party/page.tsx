"use client";
import Header from "@/app/student/_components/Header";
import PartyRegistrationForm, {
  PartyFormValues,
} from "@/app/student/_components/PartyRegistrationForm";
import { LocationService } from "@/lib/api/location/location.service";
import { useCreateParty } from "@/lib/api/party/party.queries";
import { StudentCreatePartyDto } from "@/lib/api/party/party.types";
import getMockClient from "@/lib/network/mockClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegistrationForm() {
  const createPartyMutation = useCreateParty();
  const router = useRouter();

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
        phone_number: values.phoneNumber,
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
        />
      </div>
    </div>
  );
}
