"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { orderService } from "@/services/orderService";
import { promotionService } from "@/services/promotionService";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const EMPTY_ADDRESS = { label: "Home", recipientName: "", phone: "", division: "", district: "", area: "", streetAddress: "", postalCode: "" };

export default function CheckoutPage() {
  const { user, isLoading: authLoading, isLoggingOut } = useAuth();
  const { cart, isLoading: cartLoading } = useCart();
  const router = useRouter();
  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [zone, setZone] = useState("INSIDE_DHAKA");
  const [deliveryRates, setDeliveryRates] = useState({ INSIDE_DHAKA: 70, OUTSIDE_DHAKA: 130 });
  const [couponCode, setCouponCode] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [message, setMessage] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && !isLoggingOut) router.replace("/auth/login?redirect=/checkout");
  }, [authLoading, user, isLoggingOut, router]);

  useEffect(() => {
    promotionService.getPublicDeliveryOptions().then((res) => {
      const inside = res?.data?.find((r) => r.zone === "INSIDE_DHAKA");
      const outside = res?.data?.find((r) => r.zone === "OUTSIDE_DHAKA");
      if (inside || outside) {
        setDeliveryRates({
          INSIDE_DHAKA: inside ? inside.deliveryCharge : 70,
          OUTSIDE_DHAKA: outside ? outside.deliveryCharge : 130,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/addresses`, { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        const values = data.data || [];
        setAddresses(values);
        if (values[0]) setSelectedAddressId(values[0].id);
      })
      .catch((error) => setMessage(error.message));
  }, [user]);

  const saveAddress = async (event) => {
    event.preventDefault();
    setIsSavingAddress(true);
    try {
      const response = await fetch(`${API_BASE}/api/addresses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...address, isDefault: addresses.length === 0 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save address.");
      setAddresses((previous) => [data.data, ...previous]);
      setSelectedAddressId(data.data.id);
      setAddress(EMPTY_ADDRESS);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const placeOrder = async () => {
    if (!selectedAddressId) return setMessage("Select or add a delivery address.");
    setIsPlacing(true);
    setMessage(null);
    try {
      const idempotencyKey = typeof window !== "undefined"
        ? (sessionStorage.getItem("pendingOrderKey") || `${Date.now()}_${crypto.randomUUID()}`).replace(/[^A-Za-z0-9_-]/g, "")
        : `${Date.now()}_checkout`;
      if (typeof window !== "undefined") sessionStorage.setItem("pendingOrderKey", idempotencyKey);

      const data = await orderService.create({
        addressId: selectedAddressId,
        zone,
        couponCode,
        customerNote,
        idempotencyKey,
      });

      if (typeof window !== "undefined") sessionStorage.removeItem("pendingOrderKey");
      router.push(`/order-confirmation/${data.id}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsPlacing(false);
    }
  };

  if (authLoading || !user || cartLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[50vh] items-center justify-center text-sm">Loading checkout...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="mb-8">
          <Link href="/cart" className="text-sm font-semibold text-[#9B4F5E]">← Back to bag</Link>
          <h1 className="mt-3 font-serif text-3xl font-bold">Checkout</h1>
        </div>
        {message && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>}
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-5 lg:col-span-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold">Delivery address</h2>
              {addresses.length > 0 && (
                <select
                  value={selectedAddressId}
                  onChange={(event) => setSelectedAddressId(event.target.value)}
                  className="mb-5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">Select saved address</option>
                  {addresses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}: {item.recipient_name}, {item.area}, {item.district}
                    </option>
                  ))}
                </select>
              )}
              <form onSubmit={saveAddress} className="grid gap-3 sm:grid-cols-2">
                {Object.keys(EMPTY_ADDRESS).map((key) => (
                  <input
                    key={key}
                    required={key !== "label" && key !== "postalCode"}
                    placeholder={key.replace(/([A-Z])/g, " $1")}
                    value={address[key]}
                    onChange={(event) => setAddress({ ...address, [key]: event.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                ))}
                <button
                  disabled={isSavingAddress}
                  className="rounded-xl border border-[#9B4F5E] px-4 py-3 text-sm font-semibold text-[#9B4F5E] sm:col-span-2 disabled:opacity-50"
                >
                  {isSavingAddress ? "Saving..." : "Save delivery address"}
                </button>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold">Delivery options</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setZone("INSIDE_DHAKA")}
                  className={`rounded-xl border p-3.5 text-left text-sm transition-colors ${zone === "INSIDE_DHAKA" ? "border-[#9B4F5E] bg-[#FBF0F0] font-semibold text-[#9B4F5E] dark:bg-gray-800" : "border-gray-200 dark:border-gray-800"}`}
                >
                  Inside Dhaka (৳{deliveryRates.INSIDE_DHAKA})
                </button>
                <button
                  type="button"
                  onClick={() => setZone("OUTSIDE_DHAKA")}
                  className={`rounded-xl border p-3.5 text-left text-sm transition-colors ${zone === "OUTSIDE_DHAKA" ? "border-[#9B4F5E] bg-[#FBF0F0] font-semibold text-[#9B4F5E] dark:bg-gray-800" : "border-gray-200 dark:border-gray-800"}`}
                >
                  Outside Dhaka (৳{deliveryRates.OUTSIDE_DHAKA})
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Delivery Note (Optional)</label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="e.g. Call before delivery, deliver after 3 PM, leave with security..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <h2 className="text-lg font-semibold">Order review</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-gray-500">{cart.itemCount} item(s)</p>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>৳{Number(cart.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Estimated total</span>
                <span>৳{Number(cart.estimatedTotal || cart.subtotal || 0).toLocaleString()}</span>
              </div>
            </div>
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="Coupon code (optional)"
              className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              onClick={() => setReviewOpen(true)}
              disabled={isPlacing || cart.hasBlockingIssues || !cart.items.length || !selectedAddressId}
              className="mt-5 w-full rounded-full bg-[#9B4F5E] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#843F4E] disabled:opacity-50"
            >
              Confirm order
            </button>
            {reviewOpen && (
              <div className="mt-4 rounded-xl border border-[#EED9DC] bg-[#FBF0F0] p-4 text-sm dark:border-gray-800 dark:bg-gray-800">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Deliver to {address.recipientName || addresses.find((item) => item.id === selectedAddressId)?.recipient_name || "saved address"}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  The server will verify live stock, delivery zone rules, and authoritative pricing before placing this order.
                </p>
                <button
                  onClick={placeOrder}
                  disabled={isPlacing}
                  className="mt-3 w-full rounded-xl bg-[#9B4F5E] px-4 py-2.5 font-semibold text-white hover:bg-[#843F4E] disabled:opacity-50"
                >
                  {isPlacing ? "Placing order..." : "Place order now"}
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
