import { z } from "zod";

const notPlaceholder = (v: string) => v !== "REPLACE_ME";

// Falls back to undefined for empty strings set when passing as Docker Args
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

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
});
if (!result.success) {
  const issues = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid NEXT_PUBLIC_* environment variables:\n${issues}\n\nSet these in .env.local (dev) or pass them as Docker build args (prod).`
  );
}

export const clientEnv = result.data;
