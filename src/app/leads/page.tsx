"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SidebarLayout } from "@/components/SidebarLayout";
import {
  getLeadsAction,
  getUsersAction,
  upsertLeadAction,
  deleteLeadAction,
  assignLeadAction,
  getLeadNotesAction,
  addLeadNoteAction,
  getLeadTasksAction,
  createLeadTaskAction,
  completeLeadTaskAction,
  getMatchedPropertiesAction,
} from "@/app/actions";
import {
  Users,
  Search,
  Filter,
  Target,
  Share2,
  Video,
  Globe,
  Loader2,
  Calendar,
  Phone,
  Mail,
  Fingerprint,
  Plus,
  Pencil,
  Trash2,
  X,
  UserCheck,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Sparkles,
  Send,
  CheckSquare,
  Square,
  Building,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  clickId: string | null;
  createdAt: Date;
}

interface AgentOption {
  id: string;
  name: string;
  role: string;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSource, setFormSource] = useState("Meta Ads");
  const [formStatus, setFormStatus] = useState("QUEUED");
  const [formAgentId, setFormAgentId] = useState("");
  const [formPreferredType, setFormPreferredType] = useState("");
  const [formMaxBudget, setFormMaxBudget] = useState("");

  // Lead details panel state
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<Lead | null>(null);
  const [detailTab, setDetailTab] = useState<"notes" | "tasks" | "matching">("notes");
  const [leadNotes, setLeadNotes] = useState<any[]>([]);
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [matchedProperties, setMatchedProperties] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Assign modal state
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const loadLeads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await getLeadsAction(user.role, user.id, {
        status: statusFilter,
        source: sourceFilter,
      });

      if (res.success && res.leads) {
        const parsedLeads = res.leads.map((l: any) => ({
          ...l,
          createdAt: new Date(l.createdAt),
        }));
        setLeads(parsedLeads);
        
        // If a lead is currently open in details, update its reference
        if (selectedLeadDetails) {
          const updatedSelected = parsedLeads.find((l: any) => l.id === selectedLeadDetails.id);
          if (updatedSelected) {
            setSelectedLeadDetails(updatedSelected);
          }
        }
      } else {
        setError(res.error || "Failed to load leads.");
      }
    } catch (err) {
      console.error("Leads load error:", err);
      setError("Error retrieving leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [user?.role, user?.id, statusFilter, sourceFilter]);

  // Fetch agents list for dropdown selectors
  useEffect(() => {
    async function loadAgents() {
      if (user?.role === "AGENT") return; // Agents don't need this
      const res = await getUsersAction();
      if (res.success && res.users) {
        // Show managers and agents in lists
        const agentUsers = res.users
          .filter((u: any) => u.role === "AGENT" || u.role === "MANAGER")
          .map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
        setAgents(agentUsers);
      }
    }
    loadAgents();
  }, [user?.role]);

  if (!user) return null;

  const isAdminOrManager = user.role === "SUPERADMIN" || user.role === "MANAGER";
  const isSuperAdmin = user.role === "SUPERADMIN";

  // Source Icons and Styles
  const getSourceBadge = (source: string) => {
    switch (source) {
      case "Meta Ads":
        return {
          icon: Share2,
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          name: "Meta Ads",
        };
      case "Google Ads":
        return {
          icon: Target,
          bg: "bg-red-500/10 text-red-400 border-red-500/20",
          name: "Google Ads",
        };
      case "TikTok":
        return {
          icon: Video,
          bg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
          name: "TikTok Ads",
        };
      case "Website Form":
      default:
        return {
          icon: Globe,
          bg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
          name: "Website Form",
        };
    }
  };

  // Status Styles
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "QUEUED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "WON":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "QUALIFIED":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "CONTACTED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "LOST":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "NEW":
      default:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
  };

  // Open modal for add
  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormSource("Meta Ads");
    setFormStatus("NEW");
    setFormAgentId(agents[0]?.id || "");
    setFormPreferredType("APARTMENT");
    setFormMaxBudget("");
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormEmail(lead.email || "");
    setFormPhone(lead.phone || "");
    setFormSource(lead.source);
    setFormStatus(lead.status);
    setFormAgentId(lead.assignedAgentId || "");
    setFormPreferredType((lead as any).preferredType || "APARTMENT");
    setFormMaxBudget((lead as any).maxBudget ? String((lead as any).maxBudget) : "");
    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit Lead Form (create/update)
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError("Lead name is required.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      const res = await upsertLeadAction({
        id: editingLead?.id,
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        source: formSource,
        status: formStatus,
        assignedAgentId: formAgentId || null,
        clickId: editingLead?.clickId || null,
        preferredType: formPreferredType || null,
        maxBudget: formMaxBudget ? parseFloat(formMaxBudget) : null,
      });

      if (res.success) {
        setIsModalOpen(false);
        loadLeads(); // Reload leads in table
      } else {
        setModalError(res.error || "Failed to save lead.");
      }
    } catch (err: any) {
      setModalError("Error submitting form: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Load Lead details tabs data
  const loadLeadDetailsData = async (lead: Lead) => {
    setLoadingDetails(true);
    try {
      const [notesRes, tasksRes] = await Promise.all([
        getLeadNotesAction(lead.id),
        getLeadTasksAction(lead.id),
      ]);
      if (notesRes.success) setLeadNotes(notesRes.notes || []);
      if (tasksRes.success) setLeadTasks(tasksRes.tasks || []);

      const preferredType = (lead as any).preferredType;
      const maxBudget = (lead as any).maxBudget;
      if (preferredType && maxBudget) {
        const matchesRes = await getMatchedPropertiesAction(preferredType, maxBudget);
        if (matchesRes.success) setMatchedProperties(matchesRes.properties || []);
      } else {
        setMatchedProperties([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Lead Details Drawer
  const handleOpenDetails = (lead: Lead) => {
    setSelectedLeadDetails(lead);
    setDetailTab("notes");
    setNewNoteContent("");
    setNewTaskTitle("");
    setNewTaskDueDate("");
    loadLeadDetailsData(lead);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedLeadDetails) return;
    const res = await addLeadNoteAction(
      selectedLeadDetails.id,
      user.id,
      user.name,
      newNoteContent
    );
    if (res.success) {
      setNewNoteContent("");
      loadLeadDetailsData(selectedLeadDetails);
    } else {
      alert("Failed to add note: " + res.error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate || !selectedLeadDetails) return;
    const res = await createLeadTaskAction(
      selectedLeadDetails.id,
      user.id,
      newTaskTitle,
      new Date(newTaskDueDate)
    );
    if (res.success) {
      setNewTaskTitle("");
      setNewTaskDueDate("");
      loadLeadDetailsData(selectedLeadDetails);
    } else {
      alert("Failed to create task: " + res.error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!selectedLeadDetails) return;
    const res = await completeLeadTaskAction(taskId);
    if (res.success) {
      loadLeadDetailsData(selectedLeadDetails);
    } else {
      alert("Failed to complete task");
    }
  };

  // Delete lead
  const handleDeleteLead = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete lead "${name}"?`)) return;

    try {
      const res = await deleteLeadAction(id);
      if (res.success) {
        loadLeads();
      } else {
        alert(res.error || "Failed to delete lead.");
      }
    } catch (err: any) {
      alert("Error deleting lead: " + err.message);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Leads Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Leads Tracker
            </h2>
            <p className="text-sm text-slate-400">
              {user.role === "AGENT"
                ? "Manage and nurture leads assigned to you."
                : "Real-time pipeline and attribution metrics."}
            </p>
          </div>

          {/* Add Lead button (SuperAdmin & Manager only) */}
          {isAdminOrManager && (
            <button
              onClick={handleOpenAddModal}
              id="add-lead-btn"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              Add Corporate Lead
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-4">
              {/* Status Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Lead Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-40 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-8 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="QUEUED">Queue</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="WON">Won (Closed)</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>

              {/* Source Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Platform Source
                </label>
                <div className="relative">
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="block w-40 rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-8 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ALL">All Platforms</option>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Website Form">Website Form</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Leads Count Summary */}
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500">Filtered Records</span>
              <div className="text-lg font-bold text-slate-200">
                {leads.length} {leads.length === 1 ? "Lead" : "Leads"}
              </div>
            </div>
          </div>
        </div>

        {/* Leads Table Card */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
          {loading && leads.length === 0 ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400 bg-rose-500/5">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400">
                    <th className="px-6 py-4">Lead Name</th>
                    <th className="px-6 py-4">Source Platform</th>
                    <th className="px-6 py-4">Assigned Agent</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Attribution / Click ID</th>
                    <th className="px-6 py-4">Created Date</th>
                    {isAdminOrManager && (
                      <th className="px-6 py-4 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-transparent">
                  {leads.map((lead) => {
                    const sourceInfo = getSourceBadge(lead.source);
                    const SourceIcon = sourceInfo.icon;
                    return (
                      <tr
                        key={lead.id}
                        className="transition-colors hover:bg-slate-900/40"
                      >
                        {/* Name & Contact Details */}
                        <td className="px-6 py-4 cursor-pointer" onClick={() => handleOpenDetails(lead)}>
                          <div className="font-semibold text-slate-200 text-sm hover:text-blue-400 transition-colors flex items-center gap-1">
                            {lead.name}
                            <span className="text-[9px] text-slate-500 font-normal bg-slate-950 px-1 py-0.5 rounded">Details</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-slate-400 font-medium">
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1 border-l border-slate-800 pl-3">
                                <Phone size={12} />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Source Platform */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold ${sourceInfo.bg}`}
                          >
                            <SourceIcon size={12} />
                            {sourceInfo.name}
                          </span>
                        </td>

                        {/* Assigned Agent */}
                        <td className="px-6 py-4 font-semibold text-slate-300">
                          {lead.assignedAgentName || (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold text-[10px] ${getStatusStyles(
                              lead.status
                            )}`}
                          >
                            {lead.status}
                          </span>
                        </td>

                        {/* Attribution Click ID */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 font-mono text-[10px] text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded w-fit">
                            <Fingerprint size={12} className="text-blue-400" />
                            <span className="max-w-[150px] truncate" title={lead.clickId || ""}>
                              {lead.clickId || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Date Created */}
                        <td className="px-6 py-4 text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {lead.createdAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        {/* Actions buttons */}
                        {isAdminOrManager && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => { setAssigningLead(lead); setAssignMemberId(lead.assignedAgentId || ""); }}
                                className="assign-btn p-1.5 rounded bg-slate-800 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 border border-slate-700 transition-colors"
                                title="Assign to Member"
                              >
                                <UserCheck size={13} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(lead)}
                                className="edit-btn p-1.5 rounded bg-slate-800 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 border border-slate-700 transition-colors"
                                title="Edit Lead"
                              >
                                <Pencil size={13} />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDeleteLead(lead.id, lead.name)}
                                  className="delete-btn p-1.5 rounded bg-slate-800 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-slate-700 transition-colors"
                                  title="Delete Lead"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={isAdminOrManager ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
                        No leads matching the selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over or Modal Dialog for Lead Creation/Editing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-400" />
                {editingLead ? "Edit Corporate Lead" : "Register Corporate Lead"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error logs inside form */}
            {modalError && (
              <div className="mb-4 rounded bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                {modalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Lead Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter name"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1-555-0100"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="client@gmail.com"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Traffic Source
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Website Form">Website Form</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Pipeline Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="QUEUED">Queue</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="WON">Won (Closed)</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assigned Consultant / Agent
                </label>
                <select
                  value={formAgentId}
                  onChange={(e) => setFormAgentId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Preferred Property Type
                  </label>
                  <select
                    value={formPreferredType}
                    onChange={(e) => setFormPreferredType(e.target.value)}
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
                    Maximum Budget (PKR)
                  </label>
                  <input
                    type="number"
                    value={formMaxBudget}
                    onChange={(e) => setFormMaxBudget(e.target.value)}
                    placeholder="e.g. 50000000"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
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
                  {editingLead ? "Save Changes" : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Assign Modal ── */}
      {assigningLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Assign Lead</h2>
                <p className="text-sm text-slate-400 mt-0.5">{assigningLead.name}</p>
              </div>
              <button onClick={() => setAssigningLead(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Team Member</p>
              {agents.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No team members found. Add members in Settings first.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <button
                    onClick={() => setAssignMemberId("")}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      assignMemberId === ""
                        ? "border-rose-500 bg-rose-600/10 text-white"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-400">
                      <X size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Unassigned</p>
                      <p className="text-xs text-slate-500">Remove assignment</p>
                    </div>
                  </button>
                  {agents.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setAssignMemberId(m.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        assignMemberId === m.id
                          ? "border-blue-500 bg-blue-600/20 text-white"
                          : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{m.role.toLowerCase()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAssigningLead(null)}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={assignLoading}
                  onClick={async () => {
                    if (!assigningLead) return;
                    setAssignLoading(true);
                    const member = agents.find((a) => a.id === assignMemberId);
                    const res = await assignLeadAction(
                      assigningLead.id,
                      assignMemberId || null,
                      member?.name || null
                    );
                    setAssignLoading(false);
                    if (res.success) {
                      setAssigningLead(null);
                      loadLeads();
                    } else {
                      alert("Failed to assign: " + res.error);
                    }
                  }}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {assignLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowRight size={14} />
                  )}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Details Drawer ── */}
      {selectedLeadDetails && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-slate-800 bg-slate-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedLeadDetails.name}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {selectedLeadDetails.status} • {selectedLeadDetails.source}
              </p>
            </div>
            <button
              onClick={() => setSelectedLeadDetails(null)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800 text-sm">
            <button
              onClick={() => setDetailTab("notes")}
              className={`flex-1 py-3 font-semibold text-center border-b-2 transition-colors ${
                detailTab === "notes"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-250"
              }`}
            >
              Notes & Timeline
            </button>
            <button
              onClick={() => setDetailTab("tasks")}
              className={`flex-1 py-3 font-semibold text-center border-b-2 transition-colors ${
                detailTab === "tasks"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-250"
              }`}
            >
              Tasks & Reminders
            </button>
            <button
              onClick={() => setDetailTab("matching")}
              className={`flex-1 py-3 font-semibold text-center border-b-2 transition-colors ${
                detailTab === "matching"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-250"
              }`}
            >
              Matches
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingDetails ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* 1. NOTES TAB */}
                {detailTab === "notes" && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        required
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Add internal note..."
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors flex items-center gap-1"
                      >
                        <Send size={12} />
                      </button>
                    </form>

                    <div className="space-y-4">
                      {leadNotes.map((note) => (
                        <div key={note.id} className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span className="font-bold text-slate-400">{note.userName}</span>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">{note.content}</p>
                        </div>
                      ))}
                      {leadNotes.length === 0 && (
                        <p className="text-center text-xs text-slate-500 py-6">No internal notes yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. TASKS TAB */}
                {detailTab === "tasks" && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddTask} className="bg-slate-950/20 border border-slate-800 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Follow-up Task</p>
                      <input
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Call client to discuss payment plan"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="date"
                          required
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors"
                        >
                          Add Task
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {leadTasks.map((task) => {
                        const isCompleted = task.status === "COMPLETED";
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/20 p-3 ${
                              isCompleted ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                disabled={isCompleted}
                                onClick={() => handleCompleteTask(task.id)}
                                className={`text-slate-500 hover:text-blue-400 transition-colors ${
                                  isCompleted ? "text-emerald-500 cursor-default" : ""
                                }`}
                              >
                                {isCompleted ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                              <span className={`text-xs text-slate-200 ${isCompleted ? "line-through" : ""}`}>
                                {task.title}
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                      {leadTasks.length === 0 && (
                        <p className="text-center text-xs text-slate-500 py-6">No tasks scheduled.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. PROPERTY MATCHES TAB */}
                {detailTab === "matching" && (
                  <div className="space-y-4">
                    {!(selectedLeadDetails as any).preferredType || !(selectedLeadDetails as any).maxBudget ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        Please set the Lead's Preferred Property Type and Maximum Budget in the edit form to view matches.
                      </div>
                    ) : (
                      <>
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs text-blue-400 flex items-center gap-2">
                          <Sparkles size={14} />
                          <span>
                            Matching <strong>{(selectedLeadDetails as any).preferredType}</strong> under{" "}
                            <strong>Rs. {((selectedLeadDetails as any).maxBudget).toLocaleString()}</strong>
                          </span>
                        </div>

                        <div className="space-y-3">
                          {matchedProperties.map((prop) => (
                            <div key={prop.id} className="bg-slate-950/35 border border-slate-800 rounded-xl p-4 flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-bold text-slate-200">{prop.project}</h4>
                                <p className="text-xs text-slate-500 mt-1 capitalize">{prop.type.toLowerCase()} • {prop.area} Sq.Ft</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-emerald-400">
                                  Rs. {prop.price >= 10000000
                                    ? `${(prop.price / 10000000).toFixed(2)} Crore`
                                    : prop.price >= 100000
                                    ? `${(prop.price / 100000).toFixed(2)} Lakh`
                                    : prop.price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                          {matchedProperties.length === 0 && (
                            <p className="text-center text-xs text-slate-500 py-6">No matching properties found in inventory.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
