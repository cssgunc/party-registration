"use client";

import OCSLDesktopLogoSVG from "@/components/icons/OCSL_desktop_logo.svg";
import OCSLMobileLogoSVG from "@/components/icons/OCSL_mobile_logo.svg";
import Image from "next/image";

export default function OCSLLogo() {
  return (
    <>
      <Image
        src={OCSLDesktopLogoSVG}
        alt="OCSL Desktop Logo."
        className="w-[295px] lg:block hidden"
      />
      <Image
        src={OCSLMobileLogoSVG}
        alt="OCSL Mobile Logo."
        className="w-32 p-2 lg:hidden block"
      />
    </>
  );
}
