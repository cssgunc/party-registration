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
        className={cn("w-[240px] lg:block hidden", className)}
      />
      <Image
        src={OCSLMobileLogoSVG}
        alt="OCSL Mobile Logo."
        className={cn("w-32 p-2 lg:hidden block", className)}
      />
    </>
  );
}
