import { isAxiosError } from "axios";

type ErrorMessageOptions = {
  status?: Partial<Record<number, string>>;
  fallback?: string;
};

const DEFAULT_STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request.",
  401: "You are not authenticated.",
  403: "You don't have permission to do this.",
  404: "Not found.",
  409: "Conflict. This resource may already exist.",
  422: "Invalid data submitted.",
  500: "Server error. Please try again later.",
};

/**
 * Extract a user-facing error message from an unknown thrown value.
 *
 * For Axios errors the HTTP status is checked first against any caller-provided
 * overrides in `options.status`, then against the built-in `DEFAULT_STATUS_MESSAGES`
 * map. Any status ≥ 500 that has no specific override falls through to the 500
 * message. Non-Axios errors (or Axios errors with no response) fall back to
 * `options.fallback` if provided, otherwise to a generic retry message.
 *
 * @param options - Per-status message overrides and an optional generic fallback.
 */
export function getErrorMessage(
  error: unknown,
  options: ErrorMessageOptions = {}
): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && options.status?.[status]) {
      return options.status[status] as string;
    }
    if (status && DEFAULT_STATUS_MESSAGES[status]) {
      return DEFAULT_STATUS_MESSAGES[status];
    }
    if ((status ?? 0) >= 500) {
      return options.status?.[500] ?? DEFAULT_STATUS_MESSAGES[500];
    }
  }
  console.log(error);
  if (options.fallback) {
    return options.fallback;
  }
  return "Something went wrong. Please try again.";
}
