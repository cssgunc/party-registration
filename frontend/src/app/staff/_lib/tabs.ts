export const STAFF_TABS = [
  "parties",
  "students",
  "locations",
  "accounts",
] as const;

export type TabSlug = (typeof STAFF_TABS)[number];

export const DEFAULT_TAB: TabSlug = "parties";

export const TAB_CONFIG: Record<
  TabSlug,
  { label: string; adminOnly: boolean }
> = {
  parties: { label: "Parties", adminOnly: false },
  students: { label: "Students", adminOnly: false },
  locations: { label: "Locations", adminOnly: false },
  accounts: { label: "Accounts", adminOnly: true },
};
