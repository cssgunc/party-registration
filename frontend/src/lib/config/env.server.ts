import { z } from "zod";

const notPlaceholder = (v: string) => v !== "REPLACE_ME";

const schema = z.object({
  INTERNAL_API_SECRET: z
    .string()
    .min(1)
    .refine(
      notPlaceholder,
      "INTERNAL_API_SECRET must be changed from the placeholder value"
    ),
  NEXTAUTH_SECRET: z
    .string()
    .min(1)
    .refine(
      notPlaceholder,
      "NEXTAUTH_SECRET must be changed from the placeholder value"
    ),
  NEXTAUTH_URL: z.url(),
  SAML_SP_ENTITY_ID: z.string().min(1),
  SAML_ASSERT_ENDPOINT: z.url(),
  SAML_IDP_SSO_LOGIN_URL: z.url(),
  SAML_IDP_SSO_LOGOUT_URL: z.url(),
  SAML_IDP_CERT: z.string().min(1),
  SAML_ALLOW_UNENCRYPTED_ASSERTION: z.string().transform((v) => v !== "false"),
  API_BASE_URL: z.url(),
});

function parseServerEnv(): z.infer<typeof schema> {
  if (typeof window !== "undefined") {
    throw new Error(
      "env.server.ts contains server-only variables and cannot be imported in client components."
    );
  }
  return schema.parse(process.env);
}

let _parsed: z.infer<typeof schema> | undefined;

// Lazy proxy: validation runs on first property access (at request time),
// not at module evaluation time (during `npm run build`).
export const serverEnv = new Proxy({} as z.infer<typeof schema>, {
  get(_, prop: string) {
    if (!_parsed) _parsed = parseServerEnv();
    return _parsed[prop as keyof z.infer<typeof schema>];
  },
});
