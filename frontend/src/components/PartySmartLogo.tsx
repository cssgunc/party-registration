import OCSLMobileLogoSVG from "@/components/icons/OCSL_mobile_logo.svg";
import PartySmartDesktopLogoSVG from "@/components/icons/party_smart_desktop_logo.svg";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function PartySmartLogo({ className }: { className?: string }) {
  return (
    <>
      <Image
        src={PartySmartDesktopLogoSVG}
        alt="OCSL Desktop Logo."
        className={cn("h-12 w-auto hidden lg:block", className)}
      />
      <Image
        src={OCSLMobileLogoSVG}
        alt="OCSL Mobile Logo."
        className={cn("h-12 w-auto lg:hidden block", className)}
      />
    </>
  );
}
