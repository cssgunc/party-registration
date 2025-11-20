"use client";
import Header from "@/components/Header";
import getMockClient from "@/lib/network/mockClient";
import { LocationService } from "@/services/locationService";
import { PartyService } from "@/services/partyService";
import Link from "next/link";
import { useState } from "react";
import PartyRegistrationForm, { PartyFormValues } from "../../components/PartyRegistrationForm";

export default function RegistrationForm() {
    const [data, setData] = useState<PartyFormValues | null>(null);
    const partyService = new PartyService(getMockClient("student"));


    const handleSubmit = async (values: PartyFormValues, placeId: string) => {
        try {
            const result = await partyService.createStudentParty(values, placeId);
            console.log("Created party:", result);
            setData(values);
            alert("Party created successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to create party");
        }
    };
    return (
        <div className="px-125 pb-8">
            <Header />
            <Link className="py-8" href="/StudentDashboard">
                Back
            </Link>
            <div className="font-semibold py-3 text-2xl max-w-md">Off Campus Student Life Party Registration Form</div>
            <PartyRegistrationForm onSubmit={handleSubmit} locationService={new LocationService(getMockClient("student"))} />
        </div>
    );
}