"use client";

import logout from "@/components/icons/log-out.svg";
import user from "@/components/icons/user.svg";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/signout";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Image from "next/image";
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
            <button
              className="cursor-pointer"
              aria-label={`Open user menu for ${displayName}`}
            >
              <UserAvatar
                firstName={session?.firstName}
                lastName={session?.lastName}
                name={session?.user?.name}
                email={session?.user?.email}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end">
            {role === "student" && (
              <Link href="/student/profile">
                <DropdownMenuItem>
                  <Image src={user} alt="user" />
                  <span>Edit Profile Information</span>
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <Image src={logout} alt="logout" />
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
