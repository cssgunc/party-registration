import type { AccountDto } from "../../src/lib/api/account/account.types";
import {
  ACCOUNTS as APP_ACCOUNTS,
  INCIDENTS as APP_INCIDENTS,
  LOCATIONS as APP_LOCATIONS,
  PARTIES as APP_PARTIES,
  POLICE_ACCOUNTS,
  STUDENTS,
} from "../../src/lib/mockData";

export { POLICE_ACCOUNTS, STUDENTS };

export function formatUiDate(date: Date): string {
  return date.toLocaleDateString();
}

export function formatUiTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type AggregateAccountLike = AccountDto & {
  source_id: number;
  status: "active";
};

export const ACCOUNTS: AggregateAccountLike[] = APP_ACCOUNTS.map((account) => ({
  ...account,
  source_id: account.id,
  status: "active",
}));

export const AGGREGATE_ACCOUNTS = [
  ...ACCOUNTS,
  ...POLICE_ACCOUNTS.map((police) => ({
    id: police.id,
    source_id: police.id,
    email: police.email,
    first_name: null,
    last_name: null,
    onyen: null,
    pid: null,
    role: police.role,
    status: "active" as const,
  })),
];

export const LOCATIONS = APP_LOCATIONS.map((location) => ({
  ...location,
  incident_count: location.incidents.length,
}));

export const INCIDENTS = APP_INCIDENTS.map((incident) => ({
  ...incident,
  location_id: incident.location.id,
  location_address: incident.location.formatted_address,
  reference_id: incident.reference_id ?? null,
}));

export const PARTIES = APP_PARTIES.map((party) => ({
  ...party,
  location_id: party.location.id,
  location_address: party.location.formatted_address,
  contact_one_id: party.contact_one.id,
  contact_one_name: `${party.contact_one.first_name} ${party.contact_one.last_name}`,
  contact_two_name: `${party.contact_two.first_name} ${party.contact_two.last_name}`,
  contact_two_email: party.contact_two.email,
}));

export function exactOne<T>(items: T[], predicate: (item: T) => boolean): T {
  const matches = items.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one match but found ${matches.length}`);
  }
  return matches[0];
}

export function atLeastOne<T>(items: T[], predicate: (item: T) => boolean): T {
  const match = items.find(predicate);
  if (!match) {
    throw new Error("Expected at least one matching item");
  }
  return match;
}

export function countWhere<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  return items.filter(predicate).length;
}

export function toTimeString(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function dayRangeFromDate(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function formatDateInput(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function firstUniqueToken(values: string[]): string {
  for (const value of values) {
    for (const token of value.split(/[,\s]+/).filter(Boolean)) {
      const normalized = token.trim();
      if (normalized.length < 4) continue;
      const count = values.filter((candidate) =>
        candidate.toLowerCase().includes(normalized.toLowerCase())
      ).length;
      if (count > 0 && count < values.length) {
        return normalized;
      }
    }
  }

  throw new Error("Could not determine a unique token");
}

export function byId<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map((item) => [item.id, item]));
}
