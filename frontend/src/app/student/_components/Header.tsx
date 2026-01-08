import OCSLLogo from "@/components/icons/OCSL_logo.svg";
import logout from "@/components/icons/log-out.svg";
import pfp from "@/components/icons/pfp_temp.svg";
import user from "@/components/icons/user.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <div className="bg-[#6FB2DC] h-20 w-full flex justify-between items-center">
      <Image src={OCSLLogo} alt="OCSL logo" className="pl-4 pt-7" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer">
            <Image
              src={pfp}
              alt="pfp"
              className="pr-4 pt-6"
              width={60}
              height={60}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="end">
          <Link href="/student/profile">
            <DropdownMenuItem>
              <Image src={user} alt="user" />
              <span>Edit Profile Information</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem>
            <Image src={logout} alt="logout" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
