import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your PartySmart police account password",
  robots: { index: false, follow: false },
};

/** Layout for the forgot-password page; passes children through without modification. */
export default function PoliceForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
