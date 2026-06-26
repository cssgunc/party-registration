import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

/** Root layout for the student route group; renders children without additional wrapping. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
