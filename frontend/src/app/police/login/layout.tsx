import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Police Login",
  description: "Police Login",
};

export default function PoliceLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
