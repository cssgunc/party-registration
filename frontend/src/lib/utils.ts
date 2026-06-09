import type { AppRole } from "@/lib/api/account/account.types";
import { clientEnv } from "@/lib/config/env.client";
import { type ClassValue, clsx } from "clsx";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { twMerge } from "tailwind-merge";
import * as z from "zod";
import { ContactPreference } from "./api/student/student.types";

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
  return format(date, "h:mm a");
}

/**
 * Converts a local "HH:MM" time string to its UTC equivalent.
 *
 * Time filter values come from <input type="time"> which gives local time,
 * but the backend compares against cast(datetime, SATime()) which is UTC.
 * This conversion keeps them consistent regardless of the browser timezone.
 */
export function localTimeToUtc(timeStr: string): string {
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return timeStr;
  const offsetMinutes = new Date().getTimezoneOffset(); // positive = behind UTC
  const totalMinutes = parts[0] * 60 + parts[1] + offsetMinutes;
  const utcMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${Math.floor(utcMinutes / 60)
    .toString()
    .padStart(2, "0")}:${(utcMinutes % 60).toString().padStart(2, "0")}`;
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
 * Returns true if the given date falls within the current academic year.
 * The academic year boundary is configured via NEXT_PUBLIC_ACADEMIC_YEAR_SWITCH_DATE.
 */
export function isFromThisSchoolYear(date: Date | null | undefined): boolean {
  if (!date) return false;

  const now = new Date();
  const switchThisYear = clientEnv.academicYearSwitchDate;
  const mostRecentSwitch = isBefore(now, switchThisYear)
    ? new Date(
        switchThisYear.getFullYear() - 1,
        switchThisYear.getMonth(),
        switchThisYear.getDate()
      )
    : switchThisYear;

  return isAfter(startOfDay(date), startOfDay(mostRecentSwitch));
}

/**
 * Labels for the current academic year, anchored at the configured switch date.
 *   - schoolYear:  "2025-2026"
 *   - changeDate:  "August 1, 2026" (the next switch, formatted)
 */
export function getAcademicYearLabels(): {
  schoolYear: string;
  changeDate: string;
} {
  const switchThisYear = clientEnv.academicYearSwitchDate;
  const afterSwitch = new Date() >= switchThisYear;
  const academicYearStart = afterSwitch
    ? switchThisYear.getFullYear()
    : switchThisYear.getFullYear() - 1;
  const nextSwitch = new Date(
    academicYearStart + 1,
    switchThisYear.getMonth(),
    switchThisYear.getDate()
  );
  return {
    schoolYear: `${academicYearStart}-${academicYearStart + 1}`,
    changeDate: format(nextSwitch, "MMMM d, yyyy"),
  };
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

const ADDRESS_GROUPS = [
  ["street_number", "street_name", "unit"],
  ["city"],
  ["county"],
  ["state", "zip_code"],
  ["country"],
] as const;

export type AddressField = (typeof ADDRESS_GROUPS)[number][number];

type AddressFields = Partial<Record<AddressField, string | null>>;

export function formatAddress(
  location: AddressFields | null | undefined,
  fields: AddressField[]
): string {
  if (!location) return "";
  return ADDRESS_GROUPS.map((group) =>
    group
      .filter((f) => fields.includes(f))
      .map((f) => location[f])
      .filter(Boolean)
      .join(" ")
  )
    .filter(Boolean)
    .join(", ");
}

export function buildMapsUrl(address: string, placeId: string): string {
  const params = new URLSearchParams({
    api: "1",
    query: address,
    query_place_id: placeId,
  });
  return `https://www.google.com/maps/search/?${params}`;
}

export function formatContactPreference(
  preference: ContactPreference | null | undefined
): string {
  switch (preference) {
    case "call":
      return "Call";
    case "text":
      return "Text";
    default:
      return "-";
  }
}
