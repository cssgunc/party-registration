import { redirect } from "next/navigation";
import { DEFAULT_TAB } from "./_lib/tabs";

/** Root staff route — immediately redirects to the default tab. */
export default function StaffPage() {
  redirect(`/staff/${DEFAULT_TAB}`);
}
