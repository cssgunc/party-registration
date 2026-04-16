import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSessionAccountIdFromAccessToken } from "./sessionIdentity";

function createJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("getSessionAccountIdFromAccessToken", () => {
  it("uses the backend subject as the session account id", () => {
    const accessToken = createJwt({ sub: 42, email: "admin@unc.edu" });

    assert.equal(getSessionAccountIdFromAccessToken(accessToken), "42");
  });

  it("throws when the access token has no valid subject", () => {
    const accessToken = createJwt({ email: "admin@unc.edu" });

    assert.throws(
      () => getSessionAccountIdFromAccessToken(accessToken),
      /Backend access token is missing a valid subject/
    );
  });
});
