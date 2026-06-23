import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Party",
  description: "New Party",
};

/** Layout for the new-party route; sets the page title and renders children without additional wrapping. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
