import { type ClassValue, clsx } from "clsx";
import { isAfter, isBefore, startOfDay } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if a date is before or after August 1st.
 * Course completion and residence registration expires on August 1st each year.
 */
export function isFromThisSchoolYear(date: Date | null | undefined): boolean {
  if (!date) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const augustFirst = new Date(currentYear, 8, 1);
  const mostRecentAugust1 = isBefore(now, augustFirst)
    ? new Date(currentYear - 1, 8, 1)
    : augustFirst;

  return isAfter(startOfDay(date), startOfDay(mostRecentAugust1));
}
