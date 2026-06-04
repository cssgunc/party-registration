import { Button } from "@/components/ui/button";
import { clientEnv } from "@/lib/config/env.client";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Access Denied",
    description:
      "Your account doesn't have permission to access this application. Contact your administrator if you believe this is a mistake.",
  },
  MissingRole: {
    title: "Sign-In Failed",
    description:
      "Something went wrong while processing your sign-in request. Please try again.",
  },
  SAMLAssertionFailed: {
    title: "Sign-In Failed",
    description:
      "We couldn't verify your identity with the identity provider. Please try again.",
  },
  MissingEmail: {
    title: "Sign-In Failed",
    description:
      "Your account is missing a required email address. Contact your administrator for help.",
  },
  ExchangeFailed: {
    title: "Sign-In Failed",
    description:
      "An unexpected error occurred while signing you in. Please try again or contact support if the problem persists.",
  },
};

const DEFAULT_ERROR = {
  title: "Sign-In Failed",
  description:
    "An unexpected error occurred. Please try again or contact support if the problem persists.",
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const { title, description } =
    (error ? ERROR_MESSAGES[error] : undefined) ?? DEFAULT_ERROR;
  const isPermanent = error === "AccessDenied" || error === "MissingEmail";

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-md gap-4">
        <TriangleAlert className="size-12 text-destructive" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {!isPermanent && (
          <Button asChild>
            <Link href="/">Try Again</Link>
          </Button>
        )}
        {isPermanent && (
          <Button asChild variant="outline">
            <a href={`mailto:${clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}`}>
              Contact Support
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
