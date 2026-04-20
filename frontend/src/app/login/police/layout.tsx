import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Police Login",
  description: "Police Login",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
