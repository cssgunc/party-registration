import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Party Registration",
  description: "About Party Registration",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
