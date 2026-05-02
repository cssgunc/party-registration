"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCurrentPrincipal } from "@/lib/api/auth/auth.queries";
import { signOut } from "@/lib/auth/signout";
import { cn } from "@/lib/utils";
import { LogOut, Shield, User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PartySmartLogo from "./PartySmartLogo";

export default function Header({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { data: currentPrincipal } = useCurrentPrincipal({
    enabled: status === "authenticated",
  });
  const role = session?.role;
  const displayEmail = currentPrincipal?.email ?? session?.user?.email ?? null;
  const displayName =
    currentPrincipal?.principal_type === "account"
      ? [currentPrincipal.first_name, currentPrincipal.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || currentPrincipal.email
      : currentPrincipal?.email ||
        session?.user?.name ||
        displayEmail ||
        "User";

  if (pathname.startsWith("/login")) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-primary h-(--app-header-height) px-6 w-full flex justify-between items-center",
        className
      )}
    >
      <PartySmartLogo />

      {status === "authenticated" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer rounded-full"
              aria-label={`Open user menu for ${displayName}`}
            >
              <UserAvatar
                firstName={
                  currentPrincipal?.principal_type === "account"
                    ? currentPrincipal.first_name
                    : undefined
                }
                lastName={
                  currentPrincipal?.principal_type === "account"
                    ? currentPrincipal.last_name
                    : undefined
                }
                name={displayName}
                email={displayEmail}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end">
            {role === "student" && (
              <Link href="/student/profile">
                <DropdownMenuItem>
                  <User className="size-4" />
                  <span>Edit Profile Information</span>
                </DropdownMenuItem>
              </Link>
            )}
            {role === "police_admin" && (
              <Link href="/police/admin">
                <DropdownMenuItem>
                  <Shield className="size-4" />
                  <span>Police Admin Dashboard</span>
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button asChild size="lg">
          <Link href="/login">Log In</Link>
        </Button>
      )}
    </div>
  );
}
