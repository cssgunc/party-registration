import { z } from "zod";

const notPlaceholder = (v: string) => v !== "REPLACE_ME";

// Falls back to undefined for empty strings set when passing as Docker Args
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

// MM-DD validator: enforces zero-padded month/day and a real calendar date
// (rejects e.g. 02-30). Uses a non-leap year so Feb 29 is rejected too —
// the switch date should be valid every year.
const mmDd = z
  .string()
  .regex(/^\d{2}-\d{2}$/, "Must be MM-DD format (e.g. 08-01)")
  .refine((s) => {
    const [m, d] = s.split("-").map(Number);
    const probe = new Date(2001, m - 1, d);
    return probe.getMonth() === m - 1 && probe.getDate() === d;
  }, "Must be a valid calendar date (non-leap year)");

const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z
    .string()
    .min(1)
    .refine(
      notPlaceholder,
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must be changed from the placeholder value"
    ),
  NEXT_PUBLIC_GOOGLE_MAP_ID: z
    .string()
    .min(1)
    .refine(
      notPlaceholder,
      "NEXT_PUBLIC_GOOGLE_MAP_ID must be changed from the placeholder value"
    ),
  NEXT_PUBLIC_POLICE_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(60)
  ),
  NEXT_PUBLIC_CHPD_EMAIL_DOMAIN: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("chapelhillnc.gov")
  ),
  NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().default(0.1)
  ),
  NEXT_PUBLIC_CONTACT_EMAIL: z.preprocess(
    emptyToUndefined,
    z.email().default("offcampus@unc.edu")
  ),
  NEXT_PUBLIC_COURSE_LINK: z.preprocess(
    emptyToUndefined,
    z.url().default("https://go.unc.edu/PartySmartClass")
  ),
  NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(24)
  ),
  NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(30)
  ),
  NEXT_PUBLIC_ACADEMIC_YEAR_SWITCH_DATE: z.preprocess(
    emptyToUndefined,
    mmDd.default("08-01")
  ),
  NEXT_PUBLIC_PASSWORD_RESET_TOKEN_EXPIRE_HOURS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(1)
  ),
});

// Explicitly reference each var so Next.js's static analyzer inlines them into
// the client bundle. Passing `process.env` as a whole object bypasses inlining —
// the analyzer only replaces literal `process.env.NEXT_PUBLIC_*` references.
const result = schema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_GOOGLE_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
  NEXT_PUBLIC_POLICE_VERIFICATION_RESEND_COOLDOWN_SECONDS:
    process.env.NEXT_PUBLIC_POLICE_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  NEXT_PUBLIC_CHPD_EMAIL_DOMAIN: process.env.NEXT_PUBLIC_CHPD_EMAIL_DOMAIN,
  NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES:
    process.env.NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_COURSE_LINK: process.env.NEXT_PUBLIC_COURSE_LINK,
  NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS:
    process.env.NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS,
  NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS: process.env.NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS,
  NEXT_PUBLIC_ACADEMIC_YEAR_SWITCH_DATE:
    process.env.NEXT_PUBLIC_ACADEMIC_YEAR_SWITCH_DATE,
  NEXT_PUBLIC_PASSWORD_RESET_TOKEN_EXPIRE_HOURS:
    process.env.NEXT_PUBLIC_PASSWORD_RESET_TOKEN_EXPIRE_HOURS,
});
if (!result.success) {
  const issues = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid NEXT_PUBLIC_* environment variables:\n${issues}\n\nSet these in .env.local (dev) or pass them as Docker build args (prod).`
  );
}

const [switchMonth, switchDay] =
  result.data.NEXT_PUBLIC_ACADEMIC_YEAR_SWITCH_DATE.split("-").map(Number);

export const clientEnv = {
  ...result.data,
  // Date object for THIS year's academic year switch. To get a different
  // year's switch, swap in the year: `new Date(otherYear, d.getMonth(), d.getDate())`.
  get academicYearSwitchDate(): Date {
    return new Date(new Date().getFullYear(), switchMonth - 1, switchDay);
  },
};
