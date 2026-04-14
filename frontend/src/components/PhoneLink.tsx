import { cn, formatPhoneNumber } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const phoneLinkStyles =
  "cursor-pointer text-blue-600 underline-offset-2 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export type PhoneLinkProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "href" | "children"
> & {
  phoneNumber: string;
  children?: ReactNode;
};

export function PhoneLink({
  phoneNumber,
  className,
  children,
  title,
  ...props
}: PhoneLinkProps) {
  const digits = phoneNumber.replace(/\D/g, "");
  const formatted = formatPhoneNumber(phoneNumber);

  if (!digits) {
    return (
      <span className={className}>
        {children ?? (formatted || phoneNumber)}
      </span>
    );
  }

  return (
    <a
      href={`tel:${digits}`}
      className={cn(phoneLinkStyles, className)}
      title={title ?? `Call ${formatted || digits}`}
      {...props}
    >
      {children ?? formatted}
    </a>
  );
}
