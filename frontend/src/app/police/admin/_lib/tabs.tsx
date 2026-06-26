export const POLICE_ADMIN_TABS = ["accounts", "incidents"] as const;

export type PoliceAdminTabSlug = (typeof POLICE_ADMIN_TABS)[number];

/** Type-guard that checks whether a string is a valid `PoliceAdminTabSlug`. */
export function isPoliceAdminTabSlug(
  value: string
): value is PoliceAdminTabSlug {
  return POLICE_ADMIN_TABS.some((tab) => tab === value);
}

export const DEFAULT_POLICE_ADMIN_TAB: PoliceAdminTabSlug = "accounts";

export const POLICE_ADMIN_TAB_CONFIG: Record<
  PoliceAdminTabSlug,
  { label: string }
> = {
  accounts: { label: "Accounts" },
  incidents: { label: "Incidents" },
};
