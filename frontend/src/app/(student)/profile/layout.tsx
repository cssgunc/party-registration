import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Profile",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
