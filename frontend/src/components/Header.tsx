"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useCurrentPrincipal } from "@/lib/api/auth/auth.queries";
import {
  getAllowedRoles,
  getDashboardPath,
  isStudentAreaPath,
} from "@/lib/auth/route-access";
import { signOut } from "@/lib/auth/signout";
import { cn } from "@/lib/utils";
import { LogOut, User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PartySmartLogo from "./PartySmartLogo";

export default function Header({ className }: { className?: string }) {
  const { data: session, status } = useSession();
  const { data: currentPrincipal, isPending: isPrincipalPending } =
    useCurrentPrincipal({
      enabled: status === "authenticated",
    });
  const role = session?.role;
  const pathname = usePathname();
  const showEditProfile =
    role &&
    getAllowedRoles("/").includes(role) &&
    isStudentAreaPath(pathname ?? "");

  const isAccount = currentPrincipal?.principal_type === "account";
  const firstName = isAccount ? currentPrincipal.first_name : undefined;
  const lastName = isAccount ? currentPrincipal.last_name : undefined;
  const email = currentPrincipal?.email ?? session?.user?.email ?? null;

  return (
    <div
      className={cn(
        "bg-primary h-(--app-header-height) px-6 w-full flex justify-between items-center",
        className
      )}
    >
      <Link href={getDashboardPath(role)}>
        <PartySmartLogo />
      </Link>

      {status === "loading" ||
      (status === "authenticated" && isPrincipalPending) ? (
        <Skeleton className="size-10 shrink-0 rounded-full" />
      ) : status === "authenticated" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer rounded-full"
              aria-label="Open user menu"
            >
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                email={email}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end">
            {showEditProfile && (
              <Link href="/profile">
                <DropdownMenuItem>
                  <User className="size-4" />
                  <span>Edit Profile Information</span>
                </DropdownMenuItem>
              </Link>
            )}

            <DropdownMenuItem
              onClick={() =>
                signOut({
                  callbackUrl:
                    role === "officer" || role === "police_admin"
                      ? "/police/login"
                      : "/",
                })
              }
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
