import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Police Account",
  description: "Verify Police Account",
};

export default function PoliceVerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
