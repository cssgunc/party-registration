import { redirect } from "next/navigation";
import { DEFAULT_TAB } from "./_lib/tabs";

export default function StaffPage() {
  redirect(`/staff/${DEFAULT_TAB}`);
}
