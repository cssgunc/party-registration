import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

/** Root layout for the police dashboard; passes children through without modification. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
