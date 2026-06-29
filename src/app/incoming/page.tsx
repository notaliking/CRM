"use client";

import React, { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAuth } from "@/components/AuthProvider";
import {
  getIncomingLeadsAction,
  createIncomingLeadAction,
  assignLeadAction,
  getUsersAction,
} from "@/app/actions";
import {
  Inbox,
  Plus,
  UserCheck,
  Phone,
  Mail,
  Globe,
  Target,
  Share2,
  Video,
  X,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  clickId: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  "Meta Ads": <Share2 className="h-4 w-4 text-blue-400" />,
  "Google Ads": <Target className="h-4 w-4 text-amber-400" />,
  "TikTok": <Video className="h-4 w-4 text-pink-400" />,
  "Website Form": <Globe className="h-4 w-4 text-emerald-400" />,
};

const SOURCE_COLORS: Record<string, string> = {
  "Meta Ads": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Google Ads": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "TikTok": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Website Form": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function IncomingLeadsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Lead Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSource, setFormSource] = useState("Website Form");
  const [formClickId, setFormClickId] = useState("");

  // Assign Modal
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [leadsRes, usersRes] = await Promise.all([
      getIncomingLeadsAction(),
      getUsersAction(),
    ]);
    if (leadsRes.success && leadsRes.leads) {
      setLeads(leadsRes.leads.map((l: any) => ({ ...l, createdAt: String(l.createdAt) })));
    }
    if (usersRes.success && usersRes.users) {
      setMembers(usersRes.users.filter((u: any) => u.id !== user?.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Guard: only SUPERADMIN and MANAGER can access
  if (!user) return null;
  if (user.role !== "SUPERADMIN" && user.role !== "MANAGER") {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-full text-slate-400">
          Access restricted to SuperAdmin and Manager roles.
        </div>
      </SidebarLayout>
    );
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setAddLoading(true);
    setAddError(null);
    const res = await createIncomingLeadAction({
      name: formName,
      phone: formPhone || undefined,
      email: formEmail || undefined,
      source: formSource,
      clickId: formClickId || undefined,
    });
    setAddLoading(false);
    if (res.success) {
      setShowAddModal(false);
      setFormName(""); setFormPhone(""); setFormEmail(""); setFormClickId("");
      setFormSource("Website Form");
      loadData();
    } else {
      setAddError(res.error || "Failed to add lead.");
    }
  };

  const handleAssign = async () => {
    if (!assigningLead || !selectedMemberId) return;
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;
    setAssignLoading(true);
    const res = await assignLeadAction(assigningLead.id, member.id, member.name);
    setAssignLoading(false);
    if (res.success) {
      setAssigningLead(null);
      setSelectedMemberId("");
      loadData();
    } else {
      alert("Failed to assign lead: " + res.error);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Inbox className="h-7 w-7 text-blue-400" />
              Incoming Leads
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Unassigned leads from ads and web forms. Assign them to a team member to begin follow-up.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>
        </div>

        {/* API Info Banner */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex items-start gap-3">
          <Globe className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-300">Webhook Integration</p>
            <p className="text-xs text-slate-500 mt-1">
              Connect your website forms or ad platforms to{" "}
              <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-xs">
                POST /api/intake
              </code>{" "}
              with{" "}
              <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-xs">
                {"{ name, phone, email, source, clickId }"}
              </code>{" "}
              to automatically route leads here.
            </p>
          </div>
        </div>

        {/* Lead Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
            <Inbox className="h-14 w-14 opacity-20" />
            <p className="text-lg font-medium">No incoming leads</p>
            <p className="text-sm">
              All caught up! Add a lead manually or connect your ad forms via the webhook above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">{lead.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {timeAgo(lead.createdAt)}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      SOURCE_COLORS[lead.source] ||
                      "bg-slate-700/50 text-slate-400 border-slate-600"
                    }`}
                  >
                    {SOURCE_ICONS[lead.source]}
                    {lead.source}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5">
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      {lead.phone}
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      {lead.email}
                    </div>
                  )}
                  {lead.clickId && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono truncate">
                      <span className="text-slate-600">#</span>
                      {lead.clickId}
                    </div>
                  )}
                </div>

                {/* Assign Button */}
                <button
                  onClick={() => { setAssigningLead(lead); setSelectedMemberId(""); }}
                  className="mt-auto flex items-center justify-center gap-2 w-full rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/20 hover:border-blue-400 transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  Assign to Member
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Lead Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Add Incoming Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              {addError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Phone</label>
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Lead Source <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Website Form">Website Form</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Click / Ad ID <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  value={formClickId}
                  onChange={(e) => setFormClickId(e.target.value)}
                  placeholder="fb_click_abc123"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Add to Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assigningLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Assign Lead</h2>
                <p className="text-sm text-slate-400 mt-0.5">{assigningLead.name}</p>
              </div>
              <button onClick={() => setAssigningLead(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Select Team Member
              </label>
              {members.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No team members found. Add members in Settings first.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        selectedMemberId === m.id
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
                  onClick={handleAssign}
                  disabled={!selectedMemberId || assignLoading}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {assignLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
