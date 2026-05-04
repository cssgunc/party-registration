import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Party Smart",
  description: "About Party Smart",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
