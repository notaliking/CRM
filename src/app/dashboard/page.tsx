"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SidebarLayout } from "@/components/SidebarLayout";
import { getDashboardStatsAction, completeLeadTaskAction } from "@/app/actions";
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Award,
  Terminal,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalLeads: number;
  activeInventory: number;
  salesVolume: number;
  leadsChange: string;
}

interface LeaderboardItem {
  id: string;
  name: string;
  avatarUrl: string;
  dealsClosed: number;
  volume: number;
  achievements: string[];
}

interface SystemLog {
  timestamp: string;
  level: string;
  message: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const res = await getDashboardStatsAction(user.role, user.id);
      if (res.success && res.stats) {
        setStats(res.stats);
        setLeaderboard(res.leaderboard || []);
        setLogs(res.systemLogs || []);
        setTasks(res.pendingTasks || []);
        setActivities(res.recentActivities || []);
      } else {
        setError(res.error || "Failed to load dashboard data.");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Error loading metrics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user?.role, user?.id]); // Reload data if role is overridden or changed

  if (!user) return null;

  // Format currency in PKR (Lakh/Crore)
  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `Rs. ${(val / 10000000).toFixed(2)} Crore`;
    }
    if (val >= 100000) {
      return `Rs. ${(val / 100000).toFixed(2)} Lakh`;
    }
    return `Rs. ${val.toLocaleString()}`;
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Upper Header Welcome */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Dashboard
            </h2>
            <p className="text-sm text-slate-400">
              Real-time operational snapshot of Triple Eye CRM.
            </p>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-xs">
            Logged in as: <span className="font-semibold text-blue-400">{user.name}</span>
            <span className="ml-2 rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold text-blue-400">
              {user.role}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
            {error}
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Total Leads Card */}
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md transition-all hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    {user.role === "AGENT" ? "My Assigned Leads" : "Total Leads Pipeline"}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/10">
                    <Users size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {stats?.totalLeads}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {stats?.leadsChange}
                  </span>
                </div>
              </div>

              {/* Active Inventory Card */}
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md transition-all hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    Active Property Units
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/10">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {stats?.activeInventory}
                  </span>
                  <span className="text-xs text-slate-400">
                    Units available or reserved
                  </span>
                </div>
              </div>

              {/* Sales Volume Card */}
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md transition-all hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    Closed Sales Volume
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-400 border border-amber-500/10">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {formatCurrency(stats?.salesVolume || 0)}
                  </span>
                  <span className="text-xs text-slate-400">
                    Real estate value sold
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard and Main Metrics Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Leaderboard Ranking Card */}
              <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-6">
                  <Award className="text-amber-500" size={22} />
                  <h3 className="text-lg font-bold text-slate-100">Agent Performance Leaderboard</h3>
                </div>

                <div className="space-y-4">
                  {leaderboard.map((agent, idx) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-all hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-4">
                        {/* Ranking Medal/Number */}
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold border border-slate-800 text-slate-300">
                          {idx + 1}
                        </div>
                        {/* Profile Photo */}
                        <img
                          src={agent.avatarUrl}
                          alt={agent.name}
                          className="h-10 w-10 rounded-full border border-slate-700 object-cover"
                        />
                        <div>
                          <div className="font-semibold text-slate-200 text-sm">{agent.name}</div>
                          {/* Achievements Badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.achievements.map((badge) => (
                              <span
                                key={badge}
                                className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20"
                              >
                                {badge}
                              </span>
                            ))}
                            {agent.achievements.length === 0 && (
                              <span className="text-[10px] text-slate-500">No achievements yet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Performance Figures */}
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-200">
                          {agent.dealsClosed} {agent.dealsClosed === 1 ? "Deal" : "Deals"} Closed
                        </div>
                        <div className="text-xs text-blue-400 font-semibold mt-0.5">
                          Vol: {formatCurrency(agent.volume)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && (
                    <p className="text-slate-500 text-sm">No agent statistics available.</p>
                  )}
                </div>
              </div>

              {/* Quick Info & Features (Right Column) */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    System Information
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-400">
                    <li className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span>Prisma Framework</span>
                      <span className="font-semibold text-slate-300">v7.8.0</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span>Database Engine</span>
                      <span className="font-semibold text-slate-300">SQLite (dev.db)</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span>Next.js Server</span>
                      <span className="font-semibold text-slate-300">App Router</span>
                    </li>
                  </ul>
                </div>

                {/* Team stats and limits based on role */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Role Features Access
                  </h4>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between rounded bg-slate-900 border border-slate-800 p-2">
                      <span className="text-slate-400">SuperAdmin Views:</span>
                      <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-500/20">
                        Logs & Settings
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-slate-900 border border-slate-800 p-2">
                      <span className="text-slate-400">Manager Views:</span>
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20">
                        Full Team metrics
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-slate-900 border border-slate-800 p-2">
                      <span className="text-slate-400">Agent Views:</span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                        Assigned leads only
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks and Activity Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Tasks List */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="text-blue-400" size={22} />
                  <h3 className="text-lg font-bold text-slate-100">My Follow-up Tasks</h3>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition-all hover:bg-slate-800/40"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={async () => {
                            const res = await completeLeadTaskAction(task.id);
                            if (res.success) {
                              setTasks((prev) => prev.filter((t) => t.id !== task.id));
                            } else {
                              alert("Failed to complete task");
                            }
                          }}
                          className="mt-0.5 text-slate-500 hover:text-blue-400 transition-colors"
                        >
                          <Square size={16} />
                        </button>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{task.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Lead: <span className="text-slate-300 font-medium">{task.lead.name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      No pending tasks! You're all caught up.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="text-emerald-400" size={22} />
                  <h3 className="text-lg font-bold text-slate-100">Recent Activity Feed</h3>
                </div>
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {activities.map((act) => (
                    <div key={act.id} className="relative pl-6 pb-2 border-l border-slate-800 last:border-0">
                      <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                      <div className="text-xs text-slate-400 flex justify-between items-center">
                        <span className="font-bold text-slate-300">Note added by {act.userName}</span>
                        <span>{new Date(act.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-200 mt-1.5 bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                        {act.content}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Lead: <span className="text-slate-400 font-medium">{act.lead.name}</span>
                      </p>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      No recent activities. Add notes to leads to see them here.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Logs console section (Only visible to SuperAdmin) */}
            {user.role === "SUPERADMIN" && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Terminal size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      SuperAdmin Security & System Logs
                    </h3>
                  </div>
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-400 border border-rose-500/20 animate-pulse">
                    Admin Terminal
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300">
                  {logs.map((log, idx) => {
                    let Icon = Info;
                    let color = "text-sky-400";
                    let bg = "bg-sky-500/5";

                    if (log.level === "WARNING") {
                      Icon = AlertTriangle;
                      color = "text-amber-400";
                      bg = "bg-amber-500/5";
                    } else if (log.level === "ERROR") {
                      Icon = XCircle;
                      color = "text-rose-400";
                      bg = "bg-rose-500/5";
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 rounded p-2 border border-slate-850/60 ${bg}`}
                      >
                        <span className="text-slate-500 font-semibold uppercase tracking-tight">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`inline-flex items-center gap-1 font-bold ${color}`}>
                          <Icon size={12} />
                          [{log.level}]
                        </span>
                        <span className="text-slate-300">{log.message}</span>
                      </div>
                    );
                  })}
                  {logs.length === 0 && (
                    <p className="text-slate-500 italic">No operations recorded.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
