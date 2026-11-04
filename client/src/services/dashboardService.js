import { API_BASE } from "./apiConfig";

export async function getDashboardOverview(range = "30") {
  const response = await fetch(`${API_BASE}/api/admin/dashboard/overview?range=${encodeURIComponent(range)}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Dashboard data could not be loaded.");
  }
  return data.data;
}
