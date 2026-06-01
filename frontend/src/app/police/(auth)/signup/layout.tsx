import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Police Sign Up",
  description: "Police Sign Up",
};

export default function PoliceSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
