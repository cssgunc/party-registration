"use client";
import Header from "@/app/student/_components/Header";
import PartyRegistrationForm, {
  PartyFormValues,
} from "@/app/student/_components/PartyRegistrationForm";
import { useCreateParty } from "@/lib/api/party/party.queries";
import { LocationService } from "@/lib/api/location/location.service";
import getMockClient from "@/lib/network/mockClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegistrationForm() {
  const createPartyMutation = useCreateParty();
  const router = useRouter();

  const handleSubmit = async (values: PartyFormValues, placeId: string) => {
    try {
      await createPartyMutation.mutateAsync({ values, placeId });
      alert("Party created successfully!");
      router.push("/student");
    } catch (err) {
      console.error(err);
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
