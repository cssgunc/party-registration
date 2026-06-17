import type { MetadataRoute } from "next";

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
