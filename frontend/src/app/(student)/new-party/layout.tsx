import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Party",
  description: "New Party",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
