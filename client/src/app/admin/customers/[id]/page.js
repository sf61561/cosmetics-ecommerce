"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FaArrowLeft,
  FaEdit,
  FaBan,
  FaCheck,
  FaShoppingBag,
  FaHeart,
  FaClock,
  FaMapMarkerAlt,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaEye,
  FaCartPlus,
} from "react-icons/fa";
import { customerService } from "@/services/customerService";
import Pagination from "@/components/admin/Pagination";

function CustomerHeaderAvatar({ src, name, initials }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/70 text-[#9B4F5E] dark:text-pink-300 font-bold text-xl sm:text-2xl border-2 border-pink-200/60 dark:border-pink-900/60 shadow-xs">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full border-2 border-pink-100 dark:border-gray-700 bg-gray-100 shadow-xs">
      <Image
        src={src}
        alt={name || "Customer avatar"}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 64px, 80px"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
import EditCustomerModal from "@/components/admin/customers/EditCustomerModal";
import BlockCustomerDialog from "@/components/admin/customers/BlockCustomerDialog";

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id;

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(10);
  const [ordersPagination, setOrdersPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [wishlist, setWishlist] = useState([]);
  const [activity, setActivity] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isEditing, setIsEditing] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Customer Profile & Tab Data
  useEffect(() => {
    let isSubscribed = true;

    async function fetchCustomerData() {
      if (!customerId) return;
      setIsLoading(true);
      setError(null);

      try {
        const [custRes, ordersRes, wishRes, actRes, addrRes] = await Promise.all([
          customerService.getCustomerById(customerId),
          customerService.getCustomerOrders(customerId, { page: ordersPage, limit: ordersLimit }),
          customerService.getCustomerWishlist(customerId, { limit: 24 }),
          customerService.getCustomerActivity(customerId, { limit: 30 }),
          customerService.getCustomerAddresses(customerId),
        ]);

        if (isSubscribed) {
          if (custRes?.success) setCustomer(custRes.data);
          if (ordersRes?.success) {
            setOrders(ordersRes.data || []);
            if (ordersRes.pagination) {
              setOrdersPagination({
                page: ordersRes.pagination.currentPage || ordersPage,
                limit: ordersRes.pagination.limit || ordersLimit,
                totalItems: ordersRes.pagination.totalItems || (ordersRes.data || []).length,
                totalPages: ordersRes.pagination.totalPages || 1,
              });
            }
          }
          if (wishRes?.success) setWishlist(wishRes.data || []);
          if (actRes?.success) setActivity(actRes.data || []);
          if (addrRes?.success) setAddresses(addrRes.data || []);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Failed to load customer details:", err);
          setError(err.message || "Failed to load customer details.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    fetchCustomerData();

    return () => {
      isSubscribed = false;
    };
  }, [customerId, refreshKey]);

  const handleOrdersPageChange = async (newPage) => {
    setOrdersPage(newPage);
    try {
      const res = await customerService.getCustomerOrders(customerId, { page: newPage, limit: ordersLimit });
      if (res?.success) {
        setOrders(res.data || []);
        if (res.pagination) {
          setOrdersPagination({
            page: res.pagination.currentPage || newPage,
            limit: res.pagination.limit || ordersLimit,
            totalItems: res.pagination.totalItems || (res.data || []).length,
            totalPages: res.pagination.totalPages || 1,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    }
  };

  const handleOrdersLimitChange = async (newLimit) => {
    setOrdersLimit(newLimit);
    setOrdersPage(1);
    try {
      const res = await customerService.getCustomerOrders(customerId, { page: 1, limit: newLimit });
      if (res?.success) {
        setOrders(res.data || []);
        if (res.pagination) {
          setOrdersPagination({
            page: 1,
            limit: newLimit,
            totalItems: res.pagination.totalItems || (res.data || []).length,
            totalPages: res.pagination.totalPages || 1,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    }
  };

  // Handle Edit profile
  const handleSaveProfile = async (id, updatedFields) => {
    await customerService.updateCustomerProfile(id, updatedFields);
    showToast("Customer profile updated successfully.");
    setRefreshKey((k) => k + 1);
  };

  // Handle Block / Unblock
  const handleConfirmStatus = async (id, newStatus) => {
    await customerService.updateCustomerStatus(id, newStatus);
    showToast(
      `Customer account has been ${newStatus === "BLOCKED" ? "blocked" : "unblocked"} successfully.`,
      newStatus === "BLOCKED" ? "error" : "success"
    );
    setRefreshKey((k) => k + 1);
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-10 text-center space-y-4">
        <FaExclamationCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="font-serif text-xl font-bold text-red-800 dark:text-red-300">
          Customer Not Found
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 max-w-md mx-auto">
          {error}
        </p>
        <button
          onClick={() => router.push("/admin/customers")}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#9B4F5E] text-white text-xs font-medium hover:bg-[#843F4E] transition-colors cursor-pointer shadow-xs"
        >
          <FaArrowLeft className="h-3 w-3" />
          <span>Back to Customers</span>
        </button>
      </div>
    );
  }

  if (isLoading && !customer) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-36 rounded-3xl bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CU";

  const isBlocked = customer.status === "BLOCKED";

  const tabs = [
    { id: "overview", label: "Overview", icon: FaUser },
    { id: "orders", label: `Orders (${orders.length})`, icon: FaShoppingBag },
    { id: "wishlist", label: `Wishlist (${wishlist.length})`, icon: FaHeart },
    { id: "activity", label: `Activity (${activity.length})`, icon: FaClock },
    { id: "addresses", label: `Addresses (${addresses.length})`, icon: FaMapMarkerAlt },
  ];

  return (
    <div className="space-y-6">
      {/* ── Toast Notification Banner ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <FaExclamationCircle className="h-4 w-4 shrink-0" />
          ) : (
            <FaCheckCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Breadcrumb & Back Link ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-[#9B4F5E] dark:hover:text-pink-300 transition-colors"
        >
          <FaArrowLeft className="h-3 w-3" />
          <span>Back to Customers</span>
        </Link>
      </div>

      {/* ── Customer Profile Header Card ── */}
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Avatar, Name, Contact, Status */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <CustomerHeaderAvatar
              src={customer.profilePicture}
              name={customer.name}
              initials={initials}
            />

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {customer.name}
                </h1>
                {isBlocked ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Blocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active Customer
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <FaEnvelope className="h-3 w-3 text-gray-400" />
                  {customer.email || "No email"}
                </span>
                <span className="flex items-center gap-1.5">
                  <FaPhone className="h-3 w-3 text-gray-400" />
                  {customer.phone || "No phone"}
                </span>
                <span className="flex items-center gap-1.5">
                  <FaCalendarAlt className="h-3 w-3 text-gray-400" />
                  Joined{" "}
                  {new Date(customer.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-2xs cursor-pointer"
            >
              <FaEdit className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setIsStatusDialogOpen(true)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-colors shadow-2xs cursor-pointer ${
                isBlocked
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/60"
              }`}
            >
              {isBlocked ? (
                <>
                  <FaCheck className="h-3.5 w-3.5" />
                  <span>Unblock Account</span>
                </>
              ) : (
                <>
                  <FaBan className="h-3.5 w-3.5" />
                  <span>Block Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Qualifying Orders */}
        <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Qualifying Orders
              </p>
              <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {customer.orderCount}
              </p>
              <p className="mt-1 text-xs text-gray-400">Excludes cancellations</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FaShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Total Spending */}
        <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Total Spending
              </p>
              <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                ৳{customer.totalSpent.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-400">Delivered orders</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <span className="font-bold text-lg">৳</span>
            </div>
          </div>
        </div>

        {/* Most Recent Order */}
        <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Last Order Date
              </p>
              <p className="mt-2 text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {customer.lastOrderDate
                  ? new Date(customer.lastOrderDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No orders yet"}
              </p>
              <p className="mt-1 text-xs text-gray-400">Recent store activity</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <FaClock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Wishlist Items
              </p>
              <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {wishlist.length}
              </p>
              <p className="mt-1 text-xs text-gray-400">Saved skincare products</p>
            </div>
            <div className="p-3 rounded-2xl bg-pink-50 dark:bg-pink-950/50 text-[#9B4F5E] dark:text-pink-300">
              <FaHeart className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex space-x-1 sm:space-x-2">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-[#9B4F5E] text-[#9B4F5E] dark:text-pink-300"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <IconComp className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Contents ── */}
      <div className="mt-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Details Box */}
            <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FaUser className="h-4 w-4 text-[#9B4F5E] dark:text-pink-300" />
                <span>Account Profile</span>
              </h3>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs sm:text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Full Name</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Email Address</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{customer.email || "—"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Phone</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{customer.phone || "—"}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Email Verified</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      customer.emailVerified
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {customer.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Auth Method</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{customer.authProvider || "local"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">System Role</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400 font-mono text-xs">{customer.role}</span>
                </div>
              </div>
            </div>

            {/* Primary Delivery Address Box */}
            <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FaMapMarkerAlt className="h-4 w-4 text-[#9B4F5E] dark:text-pink-300" />
                <span>Primary Delivery Address</span>
              </h3>
              {addresses.length > 0 ? (
                (() => {
                  const primaryAddr = addresses.find((a) => a.isDefault) || addresses[0];
                  return (
                    <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {primaryAddr.recipientName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/60 text-[#9B4F5E] dark:text-pink-300 font-medium">
                          {primaryAddr.label || "Home"}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {primaryAddr.streetAddress}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {primaryAddr.area}, {primaryAddr.district}, {primaryAddr.division} - {primaryAddr.postalCode}
                      </p>
                      <p className="text-gray-500 text-xs pt-1">
                        Phone: {primaryAddr.phone}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div className="py-8 text-center text-xs text-gray-400 space-y-1">
                  <p>No addresses registered by this customer.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === "orders" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs overflow-hidden">
            {orders.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-gray-400 space-y-2">
                <FaShoppingBag className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                <p>No orders placed by this customer yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 pl-6 pr-4">Order Number</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Order Status</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                        <td className="py-3.5 pl-6 pr-4 font-mono font-medium text-gray-900 dark:text-white">
                          {o.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {new Date(o.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              o.orderStatus === "DELIVERED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : o.orderStatus === "CANCELLED"
                                ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 pr-6 text-right font-semibold text-gray-900 dark:text-white">
                          ৳{o.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {orders.length > 0 && (
              <Pagination
                currentPage={ordersPagination.page}
                totalPages={ordersPagination.totalPages}
                totalItems={ordersPagination.totalItems}
                limit={ordersLimit}
                onPageChange={handleOrdersPageChange}
                onLimitChange={handleOrdersLimitChange}
                itemLabel="orders"
                variant="attached"
              />
            )}
          </div>
        )}

        {/* TAB 3: WISHLIST */}
        {activeTab === "wishlist" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
            {wishlist.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-gray-400 space-y-2">
                <FaHeart className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                <p>No products saved in customer wishlist yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {wishlist.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:border-pink-200 transition-colors"
                  >
                    <div>
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                        <Image
                          src={
                            prod.thumbnailUrl ||
                            "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80"
                          }
                          alt={prod.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-3">
                        {prod.brandName}
                      </span>
                      <h4 className="font-serif text-sm font-normal text-gray-900 dark:text-gray-100 line-clamp-1 mt-0.5">
                        {prod.name}
                      </h4>
                      <p className="mt-1 font-semibold text-xs text-gray-900 dark:text-white">
                        ৳{(prod.salePrice || prod.price).toLocaleString()}
                      </p>
                    </div>

                    <Link
                      href={`/products/${prod.slug || prod.id}`}
                      target="_blank"
                      className="mt-3 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-pink-50 hover:text-[#9B4F5E] transition-colors"
                    >
                      <FaEye className="h-3 w-3" />
                      <span>View Product</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACTIVITY */}
        {activeTab === "activity" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
            {activity.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-gray-400 space-y-2">
                <FaClock className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                <p>No recorded activity for this customer yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((act) => {
                  const isCart = act.type === "ADD_TO_CART";
                  const isWish = act.type === "WISHLIST";
                  const isPurchase = act.type === "PURCHASE";

                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl text-xs ${
                            isPurchase
                              ? "bg-purple-50 text-purple-600 dark:bg-purple-950/60"
                              : isCart
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60"
                              : isWish
                              ? "bg-pink-50 text-[#9B4F5E] dark:bg-pink-950/60"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-950/60"
                          }`}
                        >
                          {isPurchase ? (
                            <FaCheckCircle className="h-3.5 w-3.5" />
                          ) : isCart ? (
                            <FaCartPlus className="h-3.5 w-3.5" />
                          ) : isWish ? (
                            <FaHeart className="h-3.5 w-3.5" />
                          ) : (
                            <FaEye className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
                            <span className="font-semibold uppercase text-[10px] tracking-wider text-gray-500 mr-1.5">
                              {act.type.replace(/_/g, " ")}:
                            </span>
                            {act.product?.name || "Product"}
                          </p>
                          <span className="text-[11px] text-gray-400">
                            {act.product?.brandName}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs text-gray-400">
                        {new Date(act.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ADDRESSES */}
        {activeTab === "addresses" && (
          <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
            {addresses.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-gray-400 space-y-2">
                <FaMapMarkerAlt className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                <p>No delivery addresses on file for this customer.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                        {addr.recipientName}
                      </span>
                      {addr.isDefault && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                          DEFAULT ADDRESS
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      {addr.streetAddress}
                    </p>
                    <p className="text-xs text-gray-500">
                      {addr.area}, {addr.district}, {addr.division} - {addr.postalCode}
                    </p>
                    <p className="text-xs text-gray-400 pt-1">
                      Phone: {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Customer Modal ── */}
      <EditCustomerModal
        isOpen={isEditing}
        customer={customer}
        onClose={() => setIsEditing(false)}
        onSave={handleSaveProfile}
      />

      {/* ── Block / Unblock Customer Dialog ── */}
      <BlockCustomerDialog
        isOpen={isStatusDialogOpen}
        customer={customer}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleConfirmStatus}
      />
    </div>
  );
}
