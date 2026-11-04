"use client";

import { useCallback, useEffect, useState } from "react";
import { FaMapMarkerAlt, FaTrash } from "react-icons/fa";
import ProfileLayout from "@/components/profile/ProfileLayout";
import { customerAccountService } from "@/services/customerAccountService";

const emptyAddress = { label: "Home", recipientName: "", phone: "", division: "", district: "", area: "", streetAddress: "", postalCode: "" };
const fields = [
  ["label", "Address label", false],
  ["recipientName", "Recipient name", true],
  ["phone", "Phone number", true],
  ["division", "Division", true],
  ["district", "District", true],
  ["area", "Area / Thana", true],
  ["streetAddress", "Street address", true],
  ["postalCode", "Postal code", false],
];

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ ...emptyAddress });
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setAddresses(await customerAccountService.addresses());
      setMessage(null);
    } catch (error) {
      setLoadError(error.message);
      setMessage({ type: "error", text: error.message });
      return false;
    } finally {
      setIsLoading(false);
    }
    return true;
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await customerAccountService.addAddress({ ...form, isDefault: addresses.length === 0 });
      setForm({ ...emptyAddress });
      if (await load()) setMessage({ type: "success", text: "Your address has been saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    setDeletingId(id);
    setMessage(null);
    try {
      await customerAccountService.deleteAddress(id);
      if (await load()) setMessage({ type: "success", text: "Address removed." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  return <ProfileLayout title="Saved addresses" description="Store delivery addresses to make checkout quicker.">
    {message && <div role={message.type === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <form onSubmit={save} className="rounded-3xl border border-[#eee6ee] bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Add an address</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([field, label, required]) => <label key={field} className={`grid gap-2 text-xs font-semibold text-gray-600 ${field === "streetAddress" ? "sm:col-span-2" : ""}`}>{label}<input required={required} maxLength={field === "streetAddress" ? 300 : 100} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} autoComplete={field === "recipientName" ? "name" : field === "phone" ? "tel" : "off"} className="min-w-0 rounded-xl border border-gray-200 px-3 py-3 text-sm font-normal text-gray-900 outline-none focus:border-[#9B4F5E]" /></label>)}</div><button disabled={isSaving || isLoading || Boolean(loadError)} className="mt-5 w-full rounded-full bg-[#9B4F5E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#843F4E] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : isLoading ? "Loading addresses..." : "Save address"}</button></form>
      <div className="space-y-4">{isLoading ? <div role="status" className="rounded-3xl bg-white p-10 text-center text-sm text-gray-500">Loading saved addresses...</div> : loadError ? <div className="rounded-3xl bg-white p-10 text-center"><p className="text-sm text-gray-600">Saved addresses could not be loaded.</p><button type="button" onClick={load} className="mt-3 text-sm font-semibold text-[#9B4F5E] underline">Try again</button></div> : addresses.length ? addresses.map((address) => <article key={address.id} className="rounded-3xl border border-[#eee6ee] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><FaMapMarkerAlt className="mt-1 shrink-0 text-[#9B4F5E]" /><div><h2 className="font-semibold">{address.label || "Address"} {address.is_default && <span className="ml-2 rounded-full bg-[#F7E5ED] px-2 py-1 text-[10px] text-[#9B4F5E]">Default</span>}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{address.recipient_name}<br />{address.phone}<br />{[address.street_address, address.area, address.district, address.division, address.postal_code].filter(Boolean).join(", ")}</p></div></div><button type="button" onClick={() => remove(address.id)} disabled={deletingId === address.id} aria-label={`Delete ${address.label || "saved"} address`} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">{deletingId === address.id ? "..." : <FaTrash />}</button></div></article>) : <div className="rounded-3xl bg-white p-10 text-center"><h2 className="font-semibold">No saved addresses yet</h2><p className="mt-2 text-sm text-gray-500">Add a delivery address and it will be ready at checkout.</p></div>}</div>
    </div>
  </ProfileLayout>;
}
