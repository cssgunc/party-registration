import type { AccountTableRow } from "./account.types";

type AccountDeleteBlockReason = "identity-unavailable" | "self-delete";

export function getCurrentAccountId(
  sessionId: string | number | null | undefined
): number | null {
  if (sessionId == null) {
    return null;
  }

  const parsedId = Number(sessionId);
  return Number.isInteger(parsedId) ? parsedId : null;
}

export function getAccountDeleteBlockReason(
  row: AccountTableRow,
  currentAccountId: number | null
): AccountDeleteBlockReason | null {
  if (row._isPolice) {
    return null;
  }

  if (currentAccountId === null) {
    return "identity-unavailable";
  }

  return row.id === currentAccountId ? "self-delete" : null;
}

export function canDeleteAccountRow(
  row: AccountTableRow,
  currentAccountId: number | null
): boolean {
  return getAccountDeleteBlockReason(row, currentAccountId) === null;
}
