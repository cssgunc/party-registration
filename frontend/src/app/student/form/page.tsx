"use client";
import Header from "@/components/Header";
import PartyRegistrationForm, { PartyFormValues } from "@/components/PartyRegistrationForm";
import { useCreateParty } from "@/hooks/useParty";
import getMockClient from "@/lib/network/mockClient";
import { LocationService } from "@/services/locationService";
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
        <div className="px-125 pb-8">
            <Header />
            <Link className="py-8" href="/student">
                Back
            </Link>
            <div className="font-semibold py-3 text-2xl max-w-md">Off Campus Student Life Party Registration Form</div>
            <PartyRegistrationForm onSubmit={handleSubmit} locationService={new LocationService(getMockClient("student"))} />
        </div>
    );
}