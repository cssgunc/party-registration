"use client";

import PartySmartLogo from "@/components/PartySmartLogo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SAML_ROLES = [
  {
    label: "Student",
    role: "student",
    callbackUrl: "/student",
    description: "Register and manage your parties",
  },
  {
    label: "Staff",
    role: "staff",
    callbackUrl: "/staff",
    description: "Review registrations and manage students",
  },
  {
    label: "Admin",
    role: "admin",
    callbackUrl: "/staff",
    description: "Full system access and account management",
  },
] as const;

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6 bg-primary rounded-lg px-6 py-3">
            <PartySmartLogo />
          </div>
          <h1 className="text-2xl font-semibold">Sign in to continue</h1>
          <p className="text-muted-foreground">
            Choose how you&apos;d like to sign in
          </p>
        </div>

        <div className="space-y-3">
          {SAML_ROLES.map(({ label, role, callbackUrl, description }) => (
            <Link
              key={role}
              href={`/api/auth/login/saml?role=${role}&callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="block"
            >
              <Button
                variant="outline"
                className="w-full h-auto py-4 px-6 justify-start text-left"
              >
                <div>
                  <div className="font-semibold">{label}</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {description}
                  </div>
                </div>
              </Button>
            </Link>
          ))}

          <Link href="/login/police" className="block">
            <Button
              variant="outline"
              className="w-full h-auto py-4 px-6 justify-start text-left"
            >
              <div>
                <div className="font-semibold">Police</div>
                <div className="text-sm text-muted-foreground font-normal">
                  Sign in with your department credentials
                </div>
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
