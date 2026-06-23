import { DEFAULT_POLICE_ADMIN_TAB } from "@/app/police/admin/_lib/tabs";
import { redirect } from "next/navigation";

/** Index page for the police admin section; redirects to the default tab. */
export default function PoliceAdminPage() {
  redirect(`/police/admin/${DEFAULT_POLICE_ADMIN_TAB}`);
}
