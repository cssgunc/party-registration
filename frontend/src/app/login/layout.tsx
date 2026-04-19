import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
