import { decodeJwtPayload } from "./auth.service";

export function getSessionAccountIdFromAccessToken(
  accessToken: string
): string {
  const payload = decodeJwtPayload(accessToken);
  const subject = payload.sub;

  if (typeof subject !== "string" && typeof subject !== "number") {
    throw new Error("Backend access token is missing a valid subject");
  }

  return String(subject);
}
