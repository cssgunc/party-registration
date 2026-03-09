"use client";

import logout from "@/components/icons/log-out.svg";
import pfp from "@/components/icons/pfp_temp.svg";
import user from "@/components/icons/user.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import PartySmartLogo from "./PartySmartLogo";

export default function Header({ className }: { className?: string }) {
  const { role } = useRole();

  return (
    <div
      className={cn(
        "bg-primary py-4 px-6 w-full flex justify-between items-center",
        className
      )}
    >
      <PartySmartLogo />

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
          <DropdownMenuItem>
            <Image src={logout} alt="logout" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
