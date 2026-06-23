import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your PartySmart police account",
  robots: { index: false, follow: false },
};

/** Layout for the reset-password page; passes children through without modification. */
export default function PoliceResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
