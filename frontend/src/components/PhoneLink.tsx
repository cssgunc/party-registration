import type { ContactPreference } from "@/lib/api/student/student.types";
import { cn, formatPhoneNumber } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const phoneLinkStyles =
  "cursor-pointer text-blue-600 underline-offset-2 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export type PhoneLinkProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "href" | "children"
> & {
  phoneNumber: string;
  contactPreference?: ContactPreference | null;
  children?: ReactNode;
};

/**
 * Renders a phone number as a clickable `tel:` or `sms:` link based on the
 * contact preference, or as a plain `<span>` when the preference is absent or
 * unsupported.
 *
 * The `href` scheme is `sms:` for `"text"` preference and `tel:` for `"call"`.
 * Falls back to a span when `contactPreference` is null/undefined or the phone
 * number has no digits.
 */
export function PhoneLink({
  phoneNumber,
  contactPreference,
  className,
  children,
  title,
  ...props
}: PhoneLinkProps) {
  const digits = phoneNumber.replace(/\D/g, "");
  const formatted = formatPhoneNumber(phoneNumber);
  const hasSupportedPreference =
    contactPreference === "call" || contactPreference === "text";

  if (!digits || !hasSupportedPreference) {
    return (
      <span className={className}>
        {children ?? (formatted || phoneNumber)}
      </span>
    );
  }

  const isTextPreference = contactPreference === "text";
  const href = `${isTextPreference ? "sms" : "tel"}:${digits}`;
  const actionLabel = isTextPreference ? "Text" : "Call";

  return (
    <a
      href={href}
      className={cn(phoneLinkStyles, className)}
      title={title ?? `${actionLabel} ${formatted || digits}`}
      {...props}
    >
      {children ?? formatted}
    </a>
  );
}
