"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";

export default function SuperadminSidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  return <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />;
}
