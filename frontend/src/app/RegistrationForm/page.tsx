"use client";
import Link from "next/link";
import { useState } from "react";
import * as z from "zod";
import { default as PartyRegistrationForm, default as partyFormSchema } from "../../components/PartyRegistrationForm";

export default function RegistrationForm() {
    type partyFormValues = z.infer<typeof partyFormSchema>;
    const [data, setData] = useState<partyFormValues | null>(null);
    const handleSubmit = async (values: partyFormValues) => {
        try {
            const res = await fetch("http://localhost:8000/party/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // credentials: "include", 
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                console.error("Failed to create a party");
                return;
            }

            const createdParty = await res.json();
            console.log("Party created:", createdParty);

        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    return (
        <div className="px-128 py-8">
            <Link href="/StudentDashboard">
                Back
            </Link>
            <div className="font-bold pb-4">Off Campus Student Life Party Registration Form</div>
            <PartyRegistrationForm onSubmit={handleSubmit} />
        </div>
    );
}