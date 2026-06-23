import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Party Registration",
  description: "About Party Registration",
};

/** Layout for the about-party-registration route; sets the page title and renders children without additional wrapping. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
