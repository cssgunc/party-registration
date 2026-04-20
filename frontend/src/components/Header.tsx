"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  const role = session?.role;
  const displayName =
    [session?.firstName, session?.lastName].filter(Boolean).join(" ").trim() ||
    session?.user?.name ||
    session?.user?.email ||
    "User";

  if (pathname.startsWith("/login")) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-primary h-[var(--app-header-height)] px-6 w-full flex justify-between items-center",
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
                firstName={session?.firstName}
                lastName={session?.lastName}
                name={session?.user?.name}
                email={session?.user?.email}
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
