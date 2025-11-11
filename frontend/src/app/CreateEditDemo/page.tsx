"use client";
import { useState } from "react";
import * as z from "zod";
import { default as AccountTableCreateEditForm, default as AccountTableCreateEditSchema } from "../../components/AccountTableCreateEdit";
import { default as LocationTableCreateEditForm, default as LocationTableCreateEditSchema } from "../../components/LocationTableCreateEdit";
import { default as PartyTableCreateEditForm, default as PartyTableCreateEditSchema } from "../../components/PartyTableCreateEdit";
import { default as StudentTableCreateEditForm, default as StudentTableCreateEditSchema } from "../../components/StudentTableCreateEdit";

type PartyCreateEditValues = z.infer<typeof PartyTableCreateEditSchema>;
type LocationCreateEditValues = z.infer<typeof LocationTableCreateEditSchema>;
type StudentCreateEditValues = z.infer<typeof StudentTableCreateEditSchema>;
type AccountCreateEditValues = z.infer<typeof AccountTableCreateEditSchema>;


export default function CreateEditDemo() {
    const [submittedPartyData, setsubmittedPartyData] = useState<PartyCreateEditValues | null>(null);

    const handleSubmitParty = async (data: PartyCreateEditValues) => {
        console.log("Form submitted:", data);
        setsubmittedPartyData(data);
        alert("Party successfully saved!");
    };

    const [submittedLocationData, setsubmittedLocationData] = useState<LocationCreateEditValues | null>(null);

    const handleSubmitLocation = async (data: LocationCreateEditValues) => {
        console.log("Form submitted:", data);
        setsubmittedLocationData(data);
        alert("Location successfully saved!");
    };

    const [studentData, setsubmittedStudentData] = useState<StudentCreateEditValues | null>(null);

    const handleSubmitStudent = async (data: StudentCreateEditValues) => {
        console.log("Form submitted:", data);
        setsubmittedStudentData(data);
        alert("Student successfully saved!");
    };

    const [accountData, setsubmittedAccountData] = useState<AccountCreateEditValues | null>(null);

    const handleSubmitAccount = async (data: AccountCreateEditValues) => {
        console.log("Form submitted:", data);
        setsubmittedAccountData(data);
        alert("Account successfully saved!");
    };

    return (
        <main className="max-w-3xl mx-auto p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Register a Party</h1>
                <p className="text-muted-foreground">
                    Fill out the details below to create a new party registration.
                </p>

                <div className="p-6 border rounded-2xl shadow-sm bg-white">
                    <PartyTableCreateEditForm onSubmit={handleSubmitParty} />
                </div>

                {submittedPartyData ? (
                    <div className="p-4 border rounded-md bg-green-50 mt-6">
                        <h2 className="text-lg font-semibold mb-2">Submitted Data</h2>
                        <pre className="text-sm bg-white p-3 rounded-md border overflow-x-auto">
                            {JSON.stringify(submittedPartyData, null, 2)}
                        </pre>
                    </div>
                ) : null}
            </div>

            <h1 className="text-3xl font-bold">Register a Party</h1>
            <p className="text-muted-foreground">
                Fill out the details below to create a new location.
            </p>

            <div className="p-6 border rounded-2xl shadow-sm bg-white">
                <LocationTableCreateEditForm onSubmit={handleSubmitLocation} />
            </div>

            {submittedLocationData ? (
                <div className="p-4 border rounded-md bg-green-50 mt-6">
                    <h2 className="text-lg font-semibold mb-2">Submitted Data</h2>
                    <pre className="text-sm bg-white p-3 rounded-md border overflow-x-auto">
                        {JSON.stringify(submittedLocationData, null, 2)}
                    </pre>
                </div>
            ) : null}

            <div className="p-6 border rounded-2xl shadow-sm bg-white">
                <StudentTableCreateEditForm onSubmit={handleSubmitStudent} />
            </div>

            {studentData ? (
                <div className="p-4 border rounded-md bg-green-50 mt-6">
                    <h2 className="text-lg font-semibold mb-2">Submitted Data</h2>
                    <pre className="text-sm bg-white p-3 rounded-md border overflow-x-auto">
                        {JSON.stringify(studentData, null, 2)}
                    </pre>
                </div>
            ) : null}

            <div className="p-6 border rounded-2xl shadow-sm bg-white">
                <AccountTableCreateEditForm onSubmit={handleSubmitAccount} />
            </div>

            {accountData ? (
                <div className="p-4 border rounded-md bg-green-50 mt-6">
                    <h2 className="text-lg font-semibold mb-2">Submitted Data</h2>
                    <pre className="text-sm bg-white p-3 rounded-md border overflow-x-auto">
                        {JSON.stringify(accountData, null, 2)}
                    </pre>
                </div>
            ) : null}
        </main>
    );
}

