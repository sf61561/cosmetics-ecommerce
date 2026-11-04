import { redirect } from "next/navigation";

export default function LegacyDeliverySettingsPage() {
  redirect("/admin/settings/delivery");
}
