"use client";

import RegistrationTracker from "@/components/RegistrationTracker";

// Mock data for testing
const mockParties = [
    {
        id: 1,
        datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        location: {
            id: 1,
            citationCount: 0,
            warningCount: 0,
            holdExpirationDate: null,
            hasActiveHold: false,
            googleMapsPlaceId: "ChIJ123",
            fullFormattedAddress: "123 Main St, Chapel Hill, NC 27514",
            latitude: 35.9132,
            longitude: -79.0558,
            streetNumber: "123",
            streetName: "Main St",
            unit: null,
            city: "Chapel Hill",
            county: "Orange",
            state: "NC",
            country: "USA",
            zipCode: "27514",
        },
        contactOne: {
            id: 1,
            pid: "123456789",
            email: "student1@unc.edu",
            firstName: "John",
            lastName: "Doe",
            phoneNumber: "(919) 123-4567",
            contactPreference: "call" as const,
            lastRegistered: new Date().toISOString(),
        },
        contactTwo: {
            id: 2,
            pid: "987654321",
            email: "student2@unc.edu",
            firstName: "Jane",
            lastName: "Smith",
            phoneNumber: "(919) 987-6543",
            contactPreference: "text" as const,
            lastRegistered: new Date().toISOString(),
        },
    },
    {
        id: 2,
        datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        location: {
            id: 2,
            citationCount: 0,
            warningCount: 0,
            holdExpirationDate: null,
            hasActiveHold: false,
            googleMapsPlaceId: "ChIJ456",
            fullFormattedAddress: "456 Franklin St, Chapel Hill, NC 27516",
            latitude: 35.9132,
            longitude: -79.0558,
            streetNumber: "456",
            streetName: "Franklin St",
            unit: "Apt 2B",
            city: "Chapel Hill",
            county: "Orange",
            state: "NC",
            country: "USA",
            zipCode: "27516",
        },
        contactOne: {
            id: 1,
            pid: "123456789",
            email: "student1@unc.edu",
            firstName: "John",
            lastName: "Doe",
            phoneNumber: "(919) 123-4567",
            contactPreference: "call" as const,
            lastRegistered: new Date().toISOString(),
        },
        contactTwo: {
            id: 3,
            pid: "555555555",
            email: "student3@unc.edu",
            firstName: "Bob",
            lastName: "Johnson",
            phoneNumber: "(919) 555-5555",
            contactPreference: "text" as const,
            lastRegistered: new Date().toISOString(),
        },
    },
    {
        id: 3,
        datetime: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago (past)
        location: {
            id: 3,
            citationCount: 0,
            warningCount: 0,
            holdExpirationDate: null,
            hasActiveHold: false,
            googleMapsPlaceId: "ChIJ789",
            fullFormattedAddress: "789 Rosemary St, Chapel Hill, NC 27514",
            latitude: 35.9132,
            longitude: -79.0558,
            streetNumber: "789",
            streetName: "Rosemary St",
            unit: null,
            city: "Chapel Hill",
            county: "Orange",
            state: "NC",
            country: "USA",
            zipCode: "27514",
        },
        contactOne: {
            id: 2,
            pid: "987654321",
            email: "student2@unc.edu",
            firstName: "Jane",
            lastName: "Smith",
            phoneNumber: "(919) 987-6543",
            contactPreference: "text" as const,
            lastRegistered: new Date().toISOString(),
        },
        contactTwo: {
            id: 4,
            pid: "111111111",
            email: "student4@unc.edu",
            firstName: "Alice",
            lastName: "Williams",
            phoneNumber: "(919) 111-1111",
            contactPreference: "call" as const,
            lastRegistered: new Date().toISOString(),
        },
    },
];

export default function TestTrackerPage() {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">
                Registration Tracker Test
            </h1>
            <RegistrationTracker parties={mockParties} />
        </div>
    );
}
