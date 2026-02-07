import { type ClassValue, clsx } from "clsx";
import { isAfter, isBefore, startOfDay } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if a student has completed the Party Smart Course.
 * Course completion expires on August 1st each year.
 */
export function isCourseCompleted(
  lastRegistered: Date | null | undefined
): boolean {
  if (!lastRegistered) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const augustFirst = new Date(currentYear, 7, 1);
  const mostRecentAugust1 = isBefore(now, augustFirst)
    ? new Date(currentYear - 1, 7, 1)
    : augustFirst;

  return isAfter(startOfDay(lastRegistered), startOfDay(mostRecentAugust1));
}
