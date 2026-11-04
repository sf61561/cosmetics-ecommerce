import { redirect } from "next/navigation";

export default function LegacyCouponsPage() {
  redirect("/admin/settings/coupons");
}
