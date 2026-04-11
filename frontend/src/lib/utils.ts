import type { AppRole } from "@/lib/api/account/account.types";
import { type ClassValue, clsx } from "clsx";
import { isAfter, isBefore, startOfDay } from "date-fns";
import { twMerge } from "tailwind-merge";
import * as z from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a 10-digit phone number string as (XXX) XXX-XXXX.
 * Strips non-digit characters before formatting.
 * Returns an empty string for null/undefined, or the original value if not 10 digits.
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Progressive phone number formatter for input fields.
 * Formats partial input as the user types: (XXX), (XXX) XXX, (XXX) XXX-XXXX.
 */
export function formatPhoneNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Format a date as a human-readable time string, e.g. "8:30 PM".
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Zod schema for phone number fields in forms.
 * Validates at least 10 digits and transforms to raw digits on parse.
 */
export const phoneNumberSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (val) => val.replace(/\D/g, "").length === 10,
    "Phone number must be at least 10 digits"
  )
  .transform((val) => val.replace(/\D/g, ""));

/**
 * Check if a date is before or after August 1st.
 * Course completion and residence registration expires on August 1st each year.
 */
export function isFromThisSchoolYear(date: Date | null | undefined): boolean {
  if (!date) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const augustFirst = new Date(currentYear, 7, 1);
  const mostRecentAugust1 = isBefore(now, augustFirst)
    ? new Date(currentYear - 1, 7, 1)
    : augustFirst;

  return isAfter(startOfDay(date), startOfDay(mostRecentAugust1));
}

const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  staff: "Staff",
  admin: "Admin",
  officer: "Officer",
  police_admin: "Police Admin",
};

export function formatRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}
