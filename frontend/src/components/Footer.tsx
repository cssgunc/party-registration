"use client";

import { isStudentAreaPath } from "@/lib/auth/route-access";
import { clientEnv } from "@/lib/config/env.client";
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
          <a
            href={`mailto:${clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}`}
            className="hover:underline"
          >
            {clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}
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
