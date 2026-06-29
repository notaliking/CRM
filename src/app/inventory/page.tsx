"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SidebarLayout } from "@/components/SidebarLayout";
import {
  getPropertiesAction,
  upsertPropertyAction,
  deletePropertyAction,
} from "@/app/actions";
import {
  Building2,
  Search,
  BedDouble,
  Bath,
  Maximize,
  Calendar,
  Wallet,
  Loader2,
  Tags,
  Plus,
  Pencil,
  Trash2,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface Property {
  id: string;
  project: string;
  type: string;
  transaction: string;
  price: number;
  status: string;
  installments: string;
  beds: number | null;
  baths: number | null;
  area: number | null;
  createdAt: Date;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form Fields
  const [formProject, setFormProject] = useState("");
  const [formType, setFormType] = useState("APARTMENT");
  const [formTransaction, setFormTransaction] = useState("RENTING");
  const [formPrice, setFormPrice] = useState("");
  const [formStatus, setFormStatus] = useState("AVAILABLE");
  const [formInstallments, setFormInstallments] = useState("");
  const [formBeds, setFormBeds] = useState("");
  const [formBaths, setFormBaths] = useState("");
  const [formArea, setFormArea] = useState("");

  const loadProperties = async () => {
    try {
      setLoading(true);
      const res = await getPropertiesAction(searchQuery);
      if (res.success && res.properties) {
        const parsed = res.properties.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }));
        setProperties(parsed);
      } else {
        setError(res.error || "Failed to load properties.");
      }
    } catch (err) {
      console.error("Properties load error:", err);
      setError("Error loading property inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadProperties();
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!user) return null;

  const isAdminOrManager = user.role === "SUPERADMIN" || user.role === "MANAGER";
  const isSuperAdmin = user.role === "SUPERADMIN";

  // Filter properties in client for transaction and type filters
  const filteredProperties = properties.filter((property) => {
    const matchesTransaction =
      transactionFilter === "ALL" || property.transaction === transactionFilter;
    const matchesType = typeFilter === "ALL" || property.type === typeFilter;
    return matchesTransaction && matchesType;
  });

  // Price formatting in PKR (Lakh/Crore)
  const formatPrice = (price: number, transaction: string) => {
    let priceStr = "";
    if (price >= 10000000) {
      priceStr = `${(price / 10000000).toFixed(2)} Crore`;
    } else if (price >= 100000) {
      priceStr = `${(price / 100000).toFixed(2)} Lakh`;
    } else {
      priceStr = price.toLocaleString();
    }

    if (transaction === "RENTING") {
      return `Rs. ${priceStr}/mo`;
    }
    return `Rs. ${priceStr}`;
  };

  // Status Badge Classes
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "RESERVED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "SOLD":
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  // Open modal for add
  const handleOpenAddModal = () => {
    setEditingProperty(null);
    setFormProject("");
    setFormType("APARTMENT");
    setFormTransaction("INVESTMENT");
    setFormPrice("");
    setFormStatus("AVAILABLE");
    setFormInstallments("15% Down, 6 Years payment plan");
    setFormBeds("3");
    setFormBaths("2");
    setFormArea("1500");
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (property: Property) => {
    setEditingProperty(property);
    setFormProject(property.project);
    setFormType(property.type);
    setFormTransaction(property.transaction);
    setFormPrice(property.price.toString());
    setFormStatus(property.status);
    setFormInstallments(property.installments);
    setFormBeds(property.beds?.toString() || "");
    setFormBaths(property.baths?.toString() || "");
    setFormArea(property.area?.toString() || "");
    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit Property Form
  const handleSubmitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProject.trim() || !formPrice) {
      setModalError("Project name and price are required.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      const res = await upsertPropertyAction({
        id: editingProperty?.id,
        project: formProject,
        type: formType,
        transaction: formTransaction,
        price: Number(formPrice),
        status: formStatus,
        installments: formInstallments,
        beds: formBeds ? Number(formBeds) : null,
        baths: formBaths ? Number(formBaths) : null,
        area: formArea ? Number(formArea) : null,
      });

      if (res.success) {
        setIsModalOpen(false);
        loadProperties();
      } else {
        setModalError(res.error || "Failed to save property.");
      }
    } catch (err: any) {
      setModalError("Error saving property: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete property
  const handleDeleteProperty = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete property "${name}"?`)) return;

    try {
      const res = await deletePropertyAction(id);
      if (res.success) {
        loadProperties();
      } else {
        alert(res.error || "Failed to delete property.");
      }
    } catch (err: any) {
      alert("Error deleting property: " + err.message);
    }
  };

  const transactionTypes = [
    { value: "ALL", label: "All Transactions" },
    { value: "RENTING", label: "Renting" },
    { value: "RESELLING", label: "Reselling" },
    { value: "INVESTMENT", label: "Investment" },
  ];

  const propertyTypes = [
    { value: "ALL", label: "All Types" },
    { value: "APARTMENT", label: "Apartment" },
    { value: "PENTHOUSE", label: "Penthouse" },
    { value: "HOUSE", label: "House" },
    { value: "COMMERCIAL", label: "Commercial" },
    { value: "OFFICE", label: "Office" },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Inventory Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Property Inventory
            </h2>
            <p className="text-sm text-slate-400">
              Search and filter residential or commercial real estate assets.
            </p>
          </div>

          {/* Add Property Button (SuperAdmin & Manager only) */}
          {isAdminOrManager && (
            <button
              onClick={handleOpenAddModal}
              id="add-property-btn"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              Add Property Unit
            </button>
          )}
        </div>

        {/* Search and Filters panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Search by Project Name or Property Type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Total Units Listed: <b>{filteredProperties.length}</b></span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/60 sm:flex-row sm:items-center justify-between">
            {/* Transaction Types Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-2">
                Transaction
              </span>
              {transactionTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setTransactionFilter(type.value)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    transactionFilter === type.value
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Property Types Dropdown Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Type
              </span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        {loading && properties.length === 0 ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md transition-all hover:border-slate-700 shadow-md relative group"
              >
                {/* Admin Actions Overlay inside card (Pencil/Delete top right) */}
                {isAdminOrManager && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => handleOpenEditModal(property)}
                      className="edit-btn p-1.5 rounded-lg bg-slate-950/80 text-blue-400 hover:bg-blue-600 hover:text-white border border-slate-800 transition-colors shadow-md"
                      title="Edit Property"
                    >
                      <Pencil size={12} />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteProperty(property.id, property.project)}
                        className="delete-btn p-1.5 rounded-lg bg-slate-950/80 text-rose-400 hover:bg-rose-600 hover:text-white border border-slate-800 transition-colors shadow-md"
                        title="Delete Property"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Property Detail Container */}
                <div className="p-5 flex-1 space-y-4">
                  {/* Status & Transaction Header */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 border border-slate-850 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      <Tags size={10} />
                      {property.transaction}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${getStatusBadge(
                        property.status
                      )}`}
                    >
                      {property.status}
                    </span>
                  </div>

                  {/* Project Name and Type */}
                  <div>
                    <h3 className="text-base font-bold text-slate-200 truncate pr-16">
                      {property.project}
                    </h3>
                    <p className="text-xs text-blue-400 font-semibold mt-0.5">
                      {property.type}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="text-2xl font-extrabold text-slate-100">
                    {formatPrice(property.price, property.transaction)}
                  </div>

                  {/* Dimensions Specs (Beds / Baths / Sqft) */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3.5">
                    {property.beds !== null && property.beds > 0 && (
                      <span className="flex items-center gap-1">
                        <BedDouble size={14} className="text-slate-500" />
                        {property.beds} Bed{property.beds > 1 ? "s" : ""}
                      </span>
                    )}
                    {property.baths !== null && property.baths > 0 && (
                      <span className="flex items-center gap-1 border-l border-slate-800/80 pl-4">
                        <Bath size={14} className="text-slate-500" />
                        {property.baths} Bath{property.baths > 1 ? "s" : ""}
                      </span>
                    )}
                    {property.area !== null && (
                      <span className="flex items-center gap-1 border-l border-slate-800/80 pl-4">
                        <Maximize size={14} className="text-slate-500" />
                        {property.area.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Installment detail terms */}
                <div className="bg-slate-900/80 border-t border-slate-850 px-5 py-3.5 text-xs text-slate-400 flex items-start gap-2.5">
                  <Wallet size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-tight">
                    <span className="font-semibold text-slate-300 block mb-0.5">
                      Installment Structure
                    </span>
                    {property.installments}
                  </div>
                </div>
              </div>
            ))}
            {filteredProperties.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No properties match the search or filter query.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Property Form Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-blue-400" />
                {editingProperty ? "Edit Real Estate Property" : "Register Real Estate Property"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error alerts */}
            {modalError && (
              <div className="mb-4 rounded bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                {modalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitProperty} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  placeholder="e.g. Elysium Heights, Maple Residences Block B"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Property Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="APARTMENT">Apartment</option>
                    <option value="PENTHOUSE">Penthouse</option>
                    <option value="HOUSE">House</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="OFFICE">Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Transaction Class
                  </label>
                  <select
                    value={formTransaction}
                    onChange={(e) => setFormTransaction(e.target.value)}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="RENTING">Renting</option>
                    <option value="RESELLING">Reselling</option>
                    <option value="INVESTMENT">Investment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Pricing Value ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 1200000 or 3500"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Inventory Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="SOLD">Sold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Beds
                  </label>
                  <input
                    type="number"
                    value={formBeds}
                    onChange={(e) => setFormBeds(e.target.value)}
                    placeholder="e.g. 3"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Baths
                  </label>
                  <input
                    type="number"
                    value={formBaths}
                    onChange={(e) => setFormBaths(e.target.value)}
                    placeholder="e.g. 2"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Area (sqft)
                  </label>
                  <input
                    type="number"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    placeholder="e.g. 1500"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Installment Structure
                </label>
                <input
                  type="text"
                  value={formInstallments}
                  onChange={(e) => setFormInstallments(e.target.value)}
                  placeholder="e.g. 15% Down, 6 Years payment plan"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md disabled:opacity-50 transition-colors"
                >
                  {modalLoading && <Loader2 size={12} className="animate-spin" />}
                  {editingProperty ? "Save Changes" : "Create Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
