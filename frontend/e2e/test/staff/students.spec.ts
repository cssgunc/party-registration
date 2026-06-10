import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db";
import {
  FilterCase,
  SortCase,
  filterAndExpect,
  filterTestTitle,
  sortAndVerify,
} from "../../helpers/exhaustive";
import { expect, suiteTest as test } from "../../helpers/fixtures";
import {
  PARTIES,
  STUDENTS,
  WITHOUT_RESIDENCE_COUNT,
  WITH_RESIDENCE_COUNT,
  countWhere,
  currentAcademicYearStart,
  firstUniqueToken,
} from "../../helpers/seedData";
import { Steps } from "../../helpers/steps";
import {
  clickRowAction,
  confirmDialog,
  getPaginationTotal,
  getResultsSummary,
  openStaffTab,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table";

// --- Seed data constants -------------------------------------------------------

const TOTAL = 74;
const TEXT_PREF_COUNT = countWhere(
  STUDENTS,
  (s) => s.contact_preference === "text"
);
const CALL_PREF_COUNT = countWhere(
  STUDENTS,
  (s) => s.contact_preference === "call"
);
const academicYearStart = currentAcademicYearStart();
const REGISTERED_COUNT = countWhere(
  STUDENTS,
  (s) => s.last_registered !== null && s.last_registered >= academicYearStart
);
const NOT_REGISTERED_COUNT = TOTAL - REGISTERED_COUNT;

const EMAIL_TOKEN = firstUniqueToken(STUDENTS.map((s) => s.email));
const FIRST_NAME_TOKEN = firstUniqueToken(STUDENTS.map((s) => s.first_name));

// A student not referenced by any party — can be safely deleted.
const partyStudentIds = new Set(PARTIES.map((p) => p.contact_one_id));
const DELETABLE_STUDENT = STUDENTS.find((s) => !partyStudentIds.has(s.id));
if (!DELETABLE_STUDENT) throw new Error("No unreferenced student in seed");

// --- Sort and filter definitions -----------------------------------------------

const SORT_CASES: SortCase[] = [
  { header: "Email", kind: "text" },
  { header: "First Name", kind: "text" },
  { header: "Last Name", kind: "text" },
];

const FILTER_CASES: FilterCase[] = [
  // Email — text
  {
    kind: "text",
    column: "Email",
    operator: "Contains",
    value: EMAIL_TOKEN,
    expectedCount: countWhere(STUDENTS, (s) =>
      s.email.toLowerCase().includes(EMAIL_TOKEN.toLowerCase())
    ),
  },
  {
    kind: "text",
    column: "Email",
    operator: "Equals",
    value: STUDENTS[0].email,
    expectedCount: 1,
  },
  {
    kind: "text",
    column: "Email",
    operator: "Not equals",
    value: STUDENTS[0].email,
    expectedCount: TOTAL - 1,
  },
  // First Name — text
  {
    kind: "text",
    column: "First Name",
    operator: "Contains",
    value: FIRST_NAME_TOKEN,
    expectedCount: countWhere(STUDENTS, (s) =>
      s.first_name.toLowerCase().includes(FIRST_NAME_TOKEN.toLowerCase())
    ),
  },
  // Call/Text — select
  {
    kind: "select",
    column: "Call/Text",
    operator: "Equals",
    value: "Text",
    expectedCount: TEXT_PREF_COUNT,
  },
  {
    kind: "select",
    column: "Call/Text",
    operator: "Equals",
    value: "Call",
    expectedCount: CALL_PREF_COUNT,
  },
  {
    kind: "select",
    column: "Call/Text",
    operator: "Is one of",
    value: ["Call", "Text"],
    expectedCount: TOTAL,
  },
  // Is Registered — select
  {
    kind: "select",
    column: "Is Registered",
    operator: "Equals",
    value: "True",
    expectedCount: REGISTERED_COUNT,
  },
  {
    kind: "select",
    column: "Is Registered",
    operator: "Equals",
    value: "False",
    expectedCount: NOT_REGISTERED_COUNT,
  },
  // Residence — nullable text
  {
    kind: "text",
    column: "Residence",
    operator: "Is empty",
    expectedCount: WITHOUT_RESIDENCE_COUNT,
  },
  {
    kind: "text",
    column: "Residence",
    operator: "Is not empty",
    expectedCount: WITH_RESIDENCE_COUNT,
  },
];

// ==============================================================================

test.describe("Students — exhaustive", () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
  });

  // --- Read ---------------------------------------------------------------------

  test.describe("read", () => {
    test("view data: cells are populated", async ({ page }) => {
      const { total } = await getResultsSummary(page);
      expect(total).toBe(TOTAL);
    });

    test("exception: New Student button does not exist", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: /New Student/i })
      ).toHaveCount(0);
    });

    for (const { header, kind } of SORT_CASES) {
      test(`sort ${header} ascending`, async ({ page }) => {
        await sortAndVerify(page, header, kind, "asc");
      });
      test(`sort ${header} descending`, async ({ page }) => {
        await sortAndVerify(page, header, kind, "desc");
      });
    }

    for (const tc of FILTER_CASES) {
      test(filterTestTitle(tc), async ({ page }) => {
        await filterAndExpect(page, tc);
      });
    }

    test("pagination: total matches seed", async ({ page }) => {
      expect(await getPaginationTotal(page)).toBe(TOTAL);
    });

    test("global search: finds matching rows", async ({ page }) => {
      await setGlobalSearch(page, STUDENTS[0].email);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("global search: no results for nonsense input", async ({ page }) => {
      await setGlobalSearch(page, "zzz-no-match-xyz-playwright-000");
      expect(await getPaginationTotal(page)).toBe(0);
    });
  });

  // --- Modify -------------------------------------------------------------------

  test.describe("modify", () => {
    const steps = new Steps({});

    const ensureStudentEdited = steps.step(async (page) => {
      await setGlobalSearch(page, DELETABLE_STUDENT.email);
      await clickRowAction(page, DELETABLE_STUDENT.email, "Edit");
      await page.getByLabel("Phone Number").fill("9195556789");
      await selectSidebarCombobox(page, 0, "Call");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      return [] as const;
    });

    test("edit student: update phone and contact preference", async ({
      page,
    }) => {
      await ensureStudentEdited(page);
      await expect(page.getByText("(919) 555-6789")).toBeVisible();
    });

    test("delete student", async ({ page }) => {
      await ensureStudentEdited(page);
      await setGlobalSearch(page, DELETABLE_STUDENT.email);
      await clickRowAction(page, DELETABLE_STUDENT.email, "Delete");
      await confirmDialog(page, "Delete");
      await setGlobalSearch(page, DELETABLE_STUDENT.email);
      expect(await getPaginationTotal(page)).toBe(0);
    });
  });
});
