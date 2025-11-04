"use client";
import { Location } from "@/types/api/location";
import { Party } from "@/types/api/party";
import { Student } from "@/types/api/student";
import { LocationTable } from "../../components/LocationTable";
import { PartyTable } from "../../components/PartyTable";
import { StudentTable } from "../../components/StudentTable";


export default function Home() {

    const parties: Party[] = [
        {
            id: 2,
            datetime: new Date(2025, 11, 15, 22, 0, 0, 0),
            location: {
                id: 1,
                warning_count: 0,
                citation_count: 0,
                hold_expiration: null,
                has_active_hold: false,
                google_place_id: "abc123",
                formatted_address: "123 S Graham St, Chapel Hill, NC 27514",
                latitude: 35.9132,
                longitude: -79.0558,
                street_number: "123",
                street_name: "S Graham St",
                unit: null,
                city: "Chapel Hill",
                county: "Orange",
                state: "NC",
                country: "USA",
                zip_code: "27514",
            },
            contact_one: {
                id: 123,
                pid: "123456789",
                email: "bobsmith@unc.edu",
                firstName: "Bob",
                lastName: "Smith",
                contactPreference: "text",
                lastRegistered: null,
                phoneNumber: "1234567890",
                fullName: "Bob Smith"
            },
            contact_two: {
                id: 123,
                pid: "123456789",
                email: "marybrown@unc.edu",
                firstName: "Mary",
                lastName: "Brown",
                contactPreference: "text",
                lastRegistered: null,
                phoneNumber: "0987654321",
                fullName: "Mary Brown"
            }
        },
        {
            id: 2,
            datetime: new Date(2025, 10, 31, 23, 30, 0, 0),
            location: {
                id: 1,
                warning_count: 0,
                citation_count: 0,
                hold_expiration: null,
                has_active_hold: true,
                google_place_id: "abc123",
                formatted_address: "5 W Franklin St, Chapel Hill, NC 27514",
                latitude: 35.9132,
                longitude: -79.0558,
                street_number: "5",
                street_name: "Franklin St",
                unit: null,
                city: "Chapel Hill",
                county: "Orange",
                state: "NC",
                country: "USA",
                zip_code: "27514",
            },
            contact_one: {
                id: 45,
                pid: "847596039",
                email: "alexl@unc.edu",
                firstName: "Alex",
                lastName: "Levy",
                contactPreference: "call",
                lastRegistered: new Date(2025, 10, 25, 14, 12, 3, 0),
                phoneNumber: "9191026374",
                fullName: "Alex Levy"
            },
            contact_two: {
                id: 4,
                pid: "049253789",
                email: "sandrap@unc.edu",
                firstName: "Sandra",
                lastName: "Powers",
                contactPreference: "call",
                lastRegistered: new Date(2025, 9, 14, 16, 49, 2, 0),
                phoneNumber: "9195869304",
                fullName: "Sandra Powers"
            }
        },
        {
            id: 2,
            datetime: new Date(2025, 11, 2, 20, 20, 0, 0),
            location: {
                id: 1,
                warning_count: 0,
                citation_count: 0,
                hold_expiration: null,
                has_active_hold: false,
                google_place_id: "abc123",
                formatted_address: "123 S Graham St, Chapel Hill, NC 27514",
                latitude: 35.9132,
                longitude: -79.0558,
                street_number: "123",
                street_name: "S Graham St",
                unit: null,
                city: "Chapel Hill",
                county: "Orange",
                state: "NC",
                country: "USA",
                zip_code: "27514",
            },
            contact_one: {
                id: 123,
                pid: "123456789",
                email: "bobsmith@unc.edu",
                firstName: "Bob",
                lastName: "Smith",
                contactPreference: "text",
                lastRegistered: null,
                phoneNumber: "1234567890",
                fullName: "Bob Smith"
            },
            contact_two: {
                id: 123,
                pid: "123456789",
                email: "marybrown@unc.edu",
                firstName: "Mary",
                lastName: "Brown",
                contactPreference: "text",
                lastRegistered: null,
                phoneNumber: "0987654321",
                fullName: "Mary Brown"
            }
        },
    ];

    const students: Student[] = [
        {
            id: 123,
            pid: "123456789",
            email: "bobsmith@unc.edu",
            firstName: "Bob",
            lastName: "Smith",
            contactPreference: "text",
            lastRegistered: null,
            phoneNumber: "1234567890",
            fullName: "Bob Smith"
        },
        {
            id: 123,
            pid: "123456789",
            email: "marybrown@unc.edu",
            firstName: "Mary",
            lastName: "Brown",
            contactPreference: "text",
            lastRegistered: null,
            phoneNumber: "0987654321",
            fullName: "Mary Brown"
        },

        {
            id: 45,
            pid: "847596039",
            email: "alexl@unc.edu",
            firstName: "Alex",
            lastName: "Levy",
            contactPreference: "call",
            lastRegistered: new Date(2025, 10, 25, 14, 12, 3, 0),
            phoneNumber: "9191026374",
            fullName: "Alex Levy"
        },
        {
            id: 4,
            pid: "049253789",
            email: "sandrap@unc.edu",
            firstName: "Sandra",
            lastName: "Powers",
            contactPreference: "call",
            lastRegistered: new Date(2025, 9, 14, 16, 49, 2, 0),
            phoneNumber: "9195869304",
            fullName: "Sandra Powers"
        }

    ];

    const locations: Location[] = [
        {
            id: 1,
            warning_count: 1,
            citation_count: 0,
            hold_expiration: new Date(2025, 11, 1, 20, 20, 0, 0),
            has_active_hold: true,
            google_place_id: "abc123",
            formatted_address: "123 S Graham St, Chapel Hill, NC 27514",
            latitude: 35.9132,
            longitude: -79.0558,
            street_number: "123",
            street_name: "S Graham St",
            unit: null,
            city: "Chapel Hill",
            county: "Orange",
            state: "NC",
            country: "USA",
            zip_code: "27514",
        },
        {
            id: 1,
            warning_count: 4,
            citation_count: 2,
            hold_expiration: null,
            has_active_hold: true,
            google_place_id: "abc123",
            formatted_address: "5 W Franklin St, Chapel Hill, NC 27514",
            latitude: 35.9132,
            longitude: -79.0558,
            street_number: "5",
            street_name: "Franklin St",
            unit: null,
            city: "Chapel Hill",
            county: "Orange",
            state: "NC",
            country: "USA",
            zip_code: "27514",
        }

    ]
    return (
        <div className="p-8 px-24">
            <PartyTable data={parties} />

            <StudentTable data={students} />

            <LocationTable data={locations} />
        </div>
    );
}
