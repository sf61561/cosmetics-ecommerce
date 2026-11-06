"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaLock, FaSpinner, FaShoppingBag, FaArrowLeft, FaShieldAlt } from "react-icons/fa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { orderService } from "@/services/orderService";
import { API_BASE } from "@/services/apiConfig";

import SavedAddressCards from "@/components/checkout/SavedAddressCards";
import AddressForm from "@/components/checkout/AddressForm";
import AddressSummaryCard from "@/components/checkout/AddressSummaryCard";

export default function CheckoutPage() {
  const { user, isLoading: authLoading, isLoggingOut } = useAuth();
  const { cart, isLoading: cartLoading } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isAddressCollapsed, setIsAddressCollapsed] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [zone, setZone] = useState("INSIDE_DHAKA");
  const [couponCode, setCouponCode] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [message, setMessage] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user && !isLoggingOut) {
      router.replace("/auth/login?redirect=/checkout");
    }
  }, [authLoading, user, isLoggingOut, router]);

  // Load applied coupon from cart session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCode = sessionStorage.getItem("appliedCouponCode");
      if (savedCode) setCouponCode(savedCode);
    }
  }, []);

  // Fetch saved customer addresses
  useEffect(() => {
    if (!user) return;
    let isSubscribed = true;

    fetch(`${API_BASE}/api/addresses`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!isSubscribed) return;
        const values = Array.isArray(data.data) ? data.data : [];
        setAddresses(values);

        if (values.length > 0) {
          // Pre-select default address, or fallback to first
          const defaultAddr = values.find((a) => a.is_default) || values[0];
          setSelectedAddressId(defaultAddr.id);
          setIsAddressCollapsed(true);
        } else {
          setIsAddingNewAddress(true);
          setIsAddressCollapsed(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) setMessage(err.message);
      });

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  // Automatically determine delivery zone whenever selectedAddressId changes
  useEffect(() => {
    if (!selectedAddressId || !addresses.length) return;
    const selectedAddr = addresses.find((item) => item.id === selectedAddressId);
    if (!selectedAddr) return;

    const dist = (selectedAddr.district || "").trim().toLowerCase();
    const div = (selectedAddr.division || "").trim().toLowerCase();

    if (dist.includes("dhaka") || (!dist && div.includes("dhaka"))) {
      setZone("INSIDE_DHAKA");
    } else {
      setZone("OUTSIDE_DHAKA");
    }
  }, [selectedAddressId, addresses]);

  // Save new address from the AddressForm
  const handleSaveNewAddress = async (formData) => {
    setIsSavingAddress(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/addresses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.label || "Home",
          recipientName: formData.recipientName,
          phone: formData.phone,
          division: formData.division || "Dhaka",
          district: formData.district || "Dhaka",
          area: formData.area,
          streetAddress: formData.streetAddress,
          postalCode: formData.postalCode || null,
          isDefault: formData.isDefault || addresses.length === 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save address.");

      setAddresses((prev) => [data.data, ...prev]);
      setSelectedAddressId(data.data.id);
      setIsAddingNewAddress(false);
      setIsAddressCollapsed(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Place order submission
  const placeOrder = async () => {
    if (!selectedAddressId) {
      return setMessage("Please select or add a delivery address to proceed.");
    }
    setIsPlacing(true);
    setMessage(null);

    try {
      const idempotencyKey =
        typeof window !== "undefined"
          ? (sessionStorage.getItem("pendingOrderKey") || `${Date.now()}_${crypto.randomUUID()}`).replace(
              /[^A-Za-z0-9_-]/g,
              ""
            )
          : `${Date.now()}_checkout`;

      if (typeof window !== "undefined") {
        sessionStorage.setItem("pendingOrderKey", idempotencyKey);
      }

      const selectedAddr = addresses.find((item) => item.id === selectedAddressId);
      const isInside = selectedAddr
        ? Boolean(
            (selectedAddr.district && /dhaka/i.test(selectedAddr.district)) ||
            (!selectedAddr.district && selectedAddr.division && /dhaka/i.test(selectedAddr.division))
          )
        : zone === "INSIDE_DHAKA";
      const finalZone = isInside ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA";

      const finalCoupon =
        couponCode ||
        (typeof window !== "undefined" ? sessionStorage.getItem("appliedCouponCode") || "" : "");

      const data = await orderService.create({
        addressId: selectedAddressId,
        zone: finalZone,
        couponCode: finalCoupon,
        customerNote,
        idempotencyKey,
      });

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pendingOrderKey");
        sessionStorage.removeItem("appliedCouponCode");
      }

      router.push(`/order-confirmation/${data.id}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsPlacing(false);
    }
  };

  if (authLoading || !user || cartLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <FaSpinner className="animate-spin text-2xl text-[#9B4F5E]" />
          <p className="text-xs text-gray-500">Preparing your secure checkout...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
  const subtotal = Number(cart.subtotal || 0);
  const shippingFee = zone === "INSIDE_DHAKA" ? 70 : 130;
  const grandTotal = subtotal + shippingFee;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ── Breadcrumb & Page Title ── */}
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9B4F5E] dark:text-rose-300 hover:underline"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Return to Shopping Bag</span>
          </Link>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Secure Checkout
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Complete your order with Cash on Delivery across Bangladesh.
          </p>
        </div>

        {/* ── Alert Error Banner ── */}
        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in">
            <span className="font-bold shrink-0">Attention:</span>
            <span>{message}</span>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* ── Left Column: Delivery Address & Note (8 Cols) ── */}
          <section className="space-y-6 lg:col-span-8">
            {/* Delivery Address Card Container */}
            <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              {isAddressCollapsed && selectedAddr ? (
                /* ── State 1: Collapsed Compact Summary Card ── */
                <AddressSummaryCard
                  address={selectedAddr}
                  onEdit={() => {
                    setIsAddressCollapsed(false);
                    setIsAddingNewAddress(false);
                  }}
                />
              ) : isAddingNewAddress || addresses.length === 0 ? (
                /* ── State 2: Minimalist Modern Address Form ── */
                <AddressForm
                  onSubmit={handleSaveNewAddress}
                  onCancel={
                    addresses.length > 0
                      ? () => {
                          setIsAddingNewAddress(false);
                          setIsAddressCollapsed(true);
                        }
                      : null
                  }
                  hasSavedAddresses={addresses.length > 0}
                  isSubmitting={isSavingAddress}
                />
              ) : (
                /* ── State 3: Visual Saved Address Cards ── */
                <SavedAddressCards
                  addresses={addresses}
                  selectedAddressId={selectedAddressId}
                  onSelectAddress={(id) => {
                    setSelectedAddressId(id);
                    setIsAddressCollapsed(true);
                  }}
                  onAddNewAddress={() => setIsAddingNewAddress(true)}
                />
              )}
            </div>

            {/* Delivery Instructions Note Card */}
            <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <label
                htmlFor="customerNote"
                className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1"
              >
                Delivery Instructions (Optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Any specific directions, preferred delivery time, or landmark notes for your courier rider.
              </p>
              <textarea
                id="customerNote"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="e.g. Call before arrival, deliver after 2 PM, leave with building security..."
                rows={2}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-[#9B4F5E] focus:ring-2 focus:ring-[#9B4F5E]/20 focus:outline-hidden transition-all"
              />
            </div>
          </section>

          {/* ── Right Column: Order Review & Placement (4 Cols) ── */}
          <aside className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 sm:p-7 border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                  Order Summary
                </h2>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <FaShoppingBag className="text-[10px]" />
                  <span>{cart.itemCount || 0} units</span>
                </span>
              </div>

              {/* Price Breakdown */}
              <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Bag Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Delivery ({zone === "INSIDE_DHAKA" ? "Inside Dhaka" : "Nationwide"})</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ৳{shippingFee}
                  </span>
                </div>

                {couponCode && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl text-xs">
                    <span>Applied Voucher</span>
                    <span className="font-bold uppercase tracking-wider">{couponCode}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-baseline">
                  <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    Estimated Total
                  </span>
                  <span className="font-serif font-bold text-lg sm:text-xl text-[#9B4F5E] dark:text-rose-300">
                    ৳{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Order Placement CTA Button */}
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                disabled={isPlacing || cart.hasBlockingIssues || !cart.items?.length || !selectedAddressId}
                className="mt-6 w-full rounded-full bg-[#9B4F5E] hover:bg-[#843F4E] px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaLock className="text-xs" />
                <span>Confirm Order</span>
              </button>

              {/* Modal / Drawer Confirmation Prompt */}
              {reviewOpen && (
                <div className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 text-xs space-y-2 animate-in fade-in">
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    Ready to place your Cash on Delivery order?
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                    Delivering to{" "}
                    <span className="font-semibold">
                      {selectedAddr?.recipient_name || "your chosen address"}
                    </span>
                    . We will verify stock and prepare your beauty package immediately.
                  </p>
                  <button
                    type="button"
                    onClick={placeOrder}
                    disabled={isPlacing}
                    className="mt-2 w-full rounded-xl bg-[#9B4F5E] hover:bg-[#843F4E] px-4 py-2.5 font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPlacing && <FaSpinner className="animate-spin text-xs" />}
                    <span>{isPlacing ? "Placing Order..." : "Yes, Place Order Now"}</span>
                  </button>
                </div>
              )}

              {/* Security Reassurance */}
              <p className="mt-4 text-[11px] text-gray-400 dark:text-gray-500 text-center flex items-center justify-center gap-1.5">
                <FaShieldAlt className="text-[10px]" />
                <span>Pay cash upon delivery. 100% authentic cosmetics.</span>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
