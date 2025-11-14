"use client";

import RegistrationTracker from "@/components/RegistrationTracker";
import { PARTIES } from "@/lib/mockData";

export default function TestTrackerPage() {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                Registration Tracker Test
            </h1>
            <RegistrationTracker parties={PARTIES.filter(party => party.contactOne.id === 4)} />
        </div>
    );
}
