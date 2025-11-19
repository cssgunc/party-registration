import OCSLLogo from "@/components/icons/OCSL_logo.svg";
import pfp from "@/components/icons/pfp_temp.svg";
import Image from "next/image";

export default function Header() {
    return (
        <div className="bg-[#6FB2DC] h-20 w-full flex justify-between items-center">
            <Image src={OCSLLogo} alt="OCSL logo" className="pl-4 pt-7" />
            <Image src={pfp} alt="pfp" className="pr-4 pt-6" width={60} height={60} />
        </div>
    );
}