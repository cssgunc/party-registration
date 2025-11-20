import logout from "@/components/icons/log-out.svg";
import OCSLLogo from "@/components/icons/OCSL_logo.svg";
import pfp from "@/components/icons/pfp_temp.svg";
import user from "@/components/icons/user.svg";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import Link from "next/link";



export default function Header() {
    return (
        <div>
            <div className="bg-[#6FB2DC] h-20 w-full flex justify-between items-center">
                <Image src={OCSLLogo} alt="OCSL logo" className="pl-4 pt-7" />

                <Popover>
                    <PopoverTrigger asChild>
                        <Image src={pfp} alt="pfp" className="pr-4 pt-6" width={60} height={60} />
                    </PopoverTrigger>
                    <PopoverContent className="w-60">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Link href="/student/profile">
                                    <div className="flex flex-row gap-2">
                                        <Image src={user} alt="user" />
                                        <h4 className="leading-none font-small">Edit Profile Information</h4>
                                    </div>
                                </Link>
                                <div className="flex flex-row gap-2">
                                    <Image src={logout} alt="logout" />
                                    <h4 className="leading-none font-small">Logout</h4>
                                </div>
                            </div>

                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}