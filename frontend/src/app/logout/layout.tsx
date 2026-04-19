import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logout",
  description: "Logout",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
