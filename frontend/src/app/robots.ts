import type { MetadataRoute } from "next";

/**
 * Generate the `robots.txt` rules for the application.
 *
 * Disallows crawlers from police-only auth pages (signup, verify, password reset)
 * to prevent indexing of pages that are not relevant to the public.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/police/signup",
        "/police/verify",
        "/police/forgot-password",
        "/police/reset-password",
      ],
    },
  };
}
