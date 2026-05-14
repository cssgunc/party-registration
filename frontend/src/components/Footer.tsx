"use client";

import { isStudentAreaPath } from "@/lib/auth/route-access";
import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";

// "primary" | "bordered" | "minimal"
const VARIANT = "primary";

const variants = {
  primary: "bg-primary text-white font-medium",
  bordered: "border-t text-muted-foreground",
  minimal: "text-muted-foreground",
};

export default function Footer() {
  const pathname = usePathname();
  const showContact = isStudentAreaPath(pathname ?? "");

  return (
    <div
      className={`${variants[VARIANT]} px-6 py-2 flex justify-between items-center text-xs shrink-0`}
    >
      {showContact ? (
        <div>
          <span>Contact: </span>
          <a href="mailto:offcampus@unc.edu" className="hover:underline">
            offcampus@unc.edu
          </a>
        </div>
      ) : (
        <div />
      )}
      <span className="flex items-center gap-1">
        Made with <Heart className="size-3 fill-current" /> by CS+SG
      </span>
    </div>
  );
}
