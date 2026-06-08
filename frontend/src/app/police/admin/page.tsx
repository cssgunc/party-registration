import { DEFAULT_POLICE_ADMIN_TAB } from "@/app/police/admin/_lib/tabs";
import { redirect } from "next/navigation";

export default function PoliceAdminPage() {
  redirect(`/police/admin/${DEFAULT_POLICE_ADMIN_TAB}`);
}
