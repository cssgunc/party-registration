import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Profile",
};

/** Layout for the student profile route; sets the page title and renders children without additional wrapping. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
