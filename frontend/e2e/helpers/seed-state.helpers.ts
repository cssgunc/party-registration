/**
 * Shared seed-account constants for e2e specs.
 *
 * All values are sourced from:
 *   - .devcontainer/saml-idp/authsources.php  (SAML credentials / identity)
 *   - frontend/shared/mock_data.json           (backend seed data)
 *
 * SAML credentials follow the pattern <username>:<username>pass.
 * Police accounts use a shared `securepassword` (see mock_data.json).
 *
 * Import individual identities by name; use the `SeedAccount` type when
 * writing generic helpers that accept any seed identity.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SamlSeedAccount {
  /** SimpleSAMLphp username (used with loginViaSaml). */
  username: string;
  /** SimpleSAMLphp password. */
  password: string;
  email: string;
  onyen: string;
  pid: string;
  firstName: string;
  lastName: string;
}

export interface PoliceSeedAccount {
  email: string;
  /** Password for the /police/login form. */
  password: string;
  role: "officer" | "police_admin";
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

/**
 * student1 — stevenmorrison
 *
 * Seeded state:
 *  - Party Smart: COMPLETE (last_registered = NOW-14d, within current academic year).
 *  - Residence: SET (location_id 1 — 408 Pittsboro St).
 *  - Parties: many (24 as contact_one), mix of active/upcoming and past.
 *  - Residence incidents: 3 incidents at location 1.
 */
export const STUDENT1: SamlSeedAccount = {
  username: "student1",
  password: "student1pass",
  email: "stevenmorrison@unc.edu",
  onyen: "stevenmorrison",
  pid: "730523620",
  firstName: "Steven",
  lastName: "Morrison",
};

/**
 * student2 — monicamalone
 *
 * Seeded state:
 *  - Party Smart: NOT completed (last_registered = null, never registered).
 *  - Residence: NOT SET (null).
 *  - Phone/contact preference: SET (phone 7247664088, preference "text").
 *  - Parties: none as contact_one.
 */
export const STUDENT2: SamlSeedAccount = {
  username: "student2",
  password: "student2pass",
  email: "monicamalone@unc.edu",
  onyen: "monicamalone",
  pid: "730871361",
  firstName: "Monica",
  lastName: "Malone",
};

/**
 * student3 — lauragonzales
 *
 * Seeded state:
 *  - Party Smart: EXPIRED (last_registered = NOW-700d, prior academic year).
 *  - Residence: SET (location_id 2 — 306 Henderson St).
 *  - Parties: none active (no upcoming party as contact_one).
 *  - Phone/contact preference: SET (phone 8565753194, preference "call").
 */
export const STUDENT3: SamlSeedAccount = {
  username: "student3",
  password: "student3pass",
  email: "lauragonzales@unc.edu",
  onyen: "lauragonzales",
  pid: "730925227",
  firstName: "Laura",
  lastName: "Gonzales",
};

/**
 * student4 — alexrivera
 *
 * Seeded state:
 *  - Brand new: NOT present in mock_data.json; auto-provisioned on first SAML login.
 *  - Phone: null, contact_preference: null, residence: null, party_smart: null.
 *  - Useful for onboarding / first-login flows.
 */
export const STUDENT4: SamlSeedAccount = {
  username: "student4",
  password: "student4pass",
  email: "alexrivera@unc.edu",
  onyen: "alexrivera",
  pid: "730100001",
  firstName: "Alex",
  lastName: "Rivera",
};

// ---------------------------------------------------------------------------
// Staff / Admins
// ---------------------------------------------------------------------------

/**
 * admin2 — priyapatel
 *
 * Seeded state:
 *  - Valid SAML identity in the IdP (affiliation: staff).
 *  - NOT provisioned in the backend database (no mock_data.json entry).
 *  - Use for: invite-acceptance flows, AccessDenied guard testing.
 */
export const ADMIN2: SamlSeedAccount = {
  username: "admin2",
  password: "admin2pass",
  email: "priyapatel@unc.edu",
  onyen: "priyapatel",
  pid: "730100002",
  firstName: "Priya",
  lastName: "Patel",
};

// ---------------------------------------------------------------------------
// Staff / Admin
// ---------------------------------------------------------------------------

/**
 * staff1 — janesmith
 *
 * Seeded state:
 *  - Provisioned in the backend database (mock_data.json) with role=staff.
 *  - Valid SAML identity in the IdP.
 */
export const STAFF1: SamlSeedAccount = {
  username: "staff1",
  password: "staff1pass",
  email: "janesmith@unc.edu",
  onyen: "janesmith",
  pid: "730737926",
  firstName: "Jane",
  lastName: "Smith",
};

// ---------------------------------------------------------------------------
// Police
// ---------------------------------------------------------------------------

/**
 * Officer jcarter — seeded police officer account.
 *
 * Seeded state: verified, role = "officer".
 */
export const POLICE_OFFICER: PoliceSeedAccount = {
  email: "jcarter@chapelhillnc.gov",
  password: "securepassword",
  role: "officer",
};

/**
 * Police admin dreyes — seeded police admin account.
 *
 * Seeded state: verified, role = "police_admin".
 */
export const POLICE_ADMIN: PoliceSeedAccount = {
  email: "dreyes@chapelhillnc.gov",
  password: "securepassword",
  role: "police_admin",
};
