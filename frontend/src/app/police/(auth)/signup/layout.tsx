import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Police Sign Up",
  description: "Police Sign Up",
  robots: { index: false, follow: false },
};

/** Layout for the police signup page; passes children through without modification. */
export default function PoliceSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
