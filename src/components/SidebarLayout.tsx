"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  MessageSquare,
  Inbox,
  QrCode,
} from "lucide-react";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["SUPERADMIN", "MANAGER", "AGENT"],
    },
    {
      name: "Leads Tracker",
      href: "/leads",
      icon: Users,
      roles: ["SUPERADMIN", "MANAGER", "AGENT"],
    },
    {
      name: "Property Inventory",
      href: "/inventory",
      icon: Building2,
      roles: ["SUPERADMIN", "MANAGER", "AGENT"],
    },
    {
      name: "Lead Chats",
      href: "/chats",
      icon: MessageSquare,
      roles: ["SUPERADMIN", "MANAGER", "AGENT"],
    },
    {
      name: "Incoming Leads",
      href: "/incoming",
      icon: Inbox,
      roles: ["SUPERADMIN", "MANAGER"],
    },
  ];

  // System logs are visible only to SuperAdmin
  const adminItems = [
    {
      name: "Members Portal",
      href: "/portal",
      icon: QrCode,
      roles: ["SUPERADMIN"],
    },
    {
      name: "System Settings",
      href: "/settings",
      icon: ShieldCheck,
      roles: ["SUPERADMIN"],
    },
  ];

  const currentRole = user.role;
  const isSuperAdmin = currentRole === "SUPERADMIN";
  const isManager = currentRole === "MANAGER";
  let canManageTeam = false;
  if (user?.permissions) {
    try {
      const perms = JSON.parse(user.permissions);
      canManageTeam = !!perms.canManageTeam;
    } catch (e) {}
  }

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(currentRole)
  );
  
  const filteredAdminItems = adminItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (isManager && canManageTeam) return true;
    return false;
  });

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Mobile sidebar drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300 lg:static lg:block ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-20" : "w-64"}`}
      >
        {/* Brand Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-md shadow-blue-600/30">
              TE
            </div>
            {!collapsed && (
              <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Triple Eye CRM
              </span>
            )}
          </div>
          <button
            className="rounded p-1 hover:bg-slate-850 text-slate-400 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 pl-2.5"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={20} className={active ? "text-blue-400" : ""} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {filteredAdminItems.length > 0 && (
            <div className="mt-8">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Admin Panel
                </p>
              )}
              <div className="mt-2 space-y-1">
                {filteredAdminItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 pl-2.5"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon size={20} className={active ? "text-rose-400" : ""} />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between gap-2">
            {!collapsed && (
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src={user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                  alt={user.name}
                  className="h-9 w-9 rounded-full border border-slate-700 object-cover"
                />
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-semibold truncate text-slate-200">
                    {user.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
            {collapsed && (
              <img
                src={user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                alt={user.name}
                className="h-9 w-9 rounded-full border border-slate-700 object-cover mx-auto"
              />
            )}
            {!collapsed && (
              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={logout}
              className="mt-3 flex w-full justify-center rounded-lg py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-4">
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-800 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <button
              className="hidden rounded p-1 text-slate-400 hover:bg-slate-800 lg:block"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <h1 className="text-lg font-bold text-slate-100 hidden sm:block">
              Command Center
            </h1>
          </div>


        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
