import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logout",
  description: "Logout",
};

/** Pass-through layout for the logout route; sets the page metadata. */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
