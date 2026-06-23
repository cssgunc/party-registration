import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Police Login",
  description: "Police Login",
};

/** Layout for the police login page; passes children through without modification. */
export default function PoliceLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
