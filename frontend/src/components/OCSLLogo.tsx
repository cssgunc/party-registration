import OCSLDesktopLogoSVG from "@/components/icons/OCSL_desktop_logo.svg";
import OCSLMobileLogoSVG from "@/components/icons/OCSL_mobile_logo.svg";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function OCSLLogo({ className }: { className?: string }) {
  return (
    <>
      <Image
        src={OCSLDesktopLogoSVG}
        alt="OCSL Desktop Logo."
        className={cn("w-[295px] lg:block hidden", className)}
      />
      <Image
        src={OCSLMobileLogoSVG}
        alt="OCSL Mobile Logo."
        className={cn("w-32 p-2 lg:hidden block", className)}
      />
    </>
  );
}
