"use client";

import PartySmartLogo from "@/components/PartySmartLogo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SAML_LOGIN_URL = `/api/auth/login/saml?role=staff&callbackUrl=${encodeURIComponent("/staff")}`;

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6 bg-primary rounded-lg px-6 py-3">
            <PartySmartLogo />
          </div>
          <h1 className="text-2xl font-semibold">Staff Login</h1>
          <p className="text-muted-foreground">
            Sign in with your UNC credentials to access the staff dashboard.
          </p>
        </div>
        <Link href={SAML_LOGIN_URL} className="block">
          <Button className="w-full">Sign in with UNC SSO</Button>
        </Link>
      </div>
    </div>
  );
}
