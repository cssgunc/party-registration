import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Party Smart",
  description: "About Party Smart",
};

/** Layout for the about-party-smart route; sets the page title and renders children without additional wrapping. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
