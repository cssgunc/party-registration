"use client";

import logout from "@/components/icons/log-out.svg";
import pfp from "@/components/icons/pfp_temp.svg";
import user from "@/components/icons/user.svg";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PartySmartLogo from "./PartySmartLogo";

export default function Header({ className }: { className?: string }) {
  const { role } = useRole();
  const pathname = usePathname();
  const { status } = useSession();

  if (pathname.startsWith("/login")) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-primary py-4 px-6 w-full flex justify-between items-center",
        className
      )}
    >
      <PartySmartLogo />

      {status === "authenticated" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer">
              <Image src={pfp} alt="pfp" width={50} height={50} />
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
