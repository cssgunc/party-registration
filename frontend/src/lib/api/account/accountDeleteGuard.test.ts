import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AccountTableRow } from "./account.types";
import {
  canDeleteAccountRow,
  getAccountDeleteBlockReason,
  getCurrentAccountId,
} from "./accountDeleteGuard";

function createRow(overrides: Partial<AccountTableRow> = {}): AccountTableRow {
  return {
    id: 7,
    email: "admin@unc.edu",
    first_name: "Admin",
    last_name: "User",
    pid: "123456789",
    onyen: "adminuser",
    role: "admin",
    _isPolice: false,
    ...overrides,
  };
}

describe("getCurrentAccountId", () => {
  it("parses numeric session ids", () => {
    assert.equal(getCurrentAccountId("42"), 42);
  });

  it("returns null for non-numeric session ids", () => {
    assert.equal(getCurrentAccountId("saml-name-id"), null);
  });
});

describe("account delete guards", () => {
  it("blocks deleting the current admin row", () => {
    const row = createRow({ id: 42 });

    assert.equal(canDeleteAccountRow(row, 42), false);
    assert.equal(getAccountDeleteBlockReason(row, 42), "self-delete");
  });

  it("allows deleting a different admin or staff row", () => {
    const row = createRow({ id: 99, role: "staff" });

    assert.equal(canDeleteAccountRow(row, 42), true);
    assert.equal(getAccountDeleteBlockReason(row, 42), null);
  });

  it("keeps police rows deletable from the staff dashboard", () => {
    const row = createRow({
      id: 42,
      email: "police@unc.edu",
      role: "police_admin",
      _isPolice: true,
    });

    assert.equal(canDeleteAccountRow(row, 42), true);
    assert.equal(getAccountDeleteBlockReason(row, 42), null);
  });

  it("fails closed for account rows when session identity is unavailable", () => {
    const row = createRow({ id: 42 });

    assert.equal(canDeleteAccountRow(row, null), false);
    assert.equal(
      getAccountDeleteBlockReason(row, null),
      "identity-unavailable"
    );
  });
});
