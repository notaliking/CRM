"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SidebarLayout } from "@/components/SidebarLayout";
import {
  getUsersAction,
  upsertUserAction,
  deleteUserAction,
  getMetaSettingsAction,
  saveMetaSettingsAction,
  getMetaTemplatesAction,
  updateUserProfileAction,
  getSharedAssetsAction,
  createSharedAssetAction,
  deleteSharedAssetAction,
  changePasswordAction,
} from "@/app/actions";
import {
  ShieldCheck,
  HardDrive,
  Cpu,
  RefreshCw,
  Lock,
  Save,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Mail,
  UserCheck,
  Settings,
  MessageSquare,
  Upload,
  User as UserIcon,
  FolderOpen,
  FileText,
  Video,
  Image as ImageIcon,
  File,
  Copy,
  Check,
  Globe,
  Phone,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  whatsapp: string | null;
  permissions?: string | null;
}

interface SharedAsset {
  id: string;
  name: string;
  category: string;
  url: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isManager = user?.role === "MANAGER";
  let canManageTeam = false;
  if (user?.permissions) {
    try {
      const perms = JSON.parse(user.permissions);
      canManageTeam = !!perms.canManageTeam;
    } catch (e) {}
  }
  
  // Tabs: "profile" | "team" | "meta" | "assets" | "system"
  const [activeTab, setActiveTab] = useState<"profile" | "team" | "meta" | "assets" | "system">("profile");

  // Profile Settings State
  const [profileName, setProfileName] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Team Directory State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta Settings State
  const [metaToken, setMetaToken] = useState("");
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState(false);

  // Shared Assets Library State
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("BROCHURE_PDF");
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [modalUploadingAvatar, setModalUploadingAvatar] = useState(false);

  // Form Fields for Member Modal
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("AGENT");
  const [formAvatar, setFormAvatar] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formCanViewTeamChats, setFormCanViewTeamChats] = useState(false);
  const [formCanManageTeam, setFormCanManageTeam] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const memberAvatarInputRef = useRef<HTMLInputElement>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Profile State
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileAvatar(user.avatarUrl || "");
      // Fetch user's WhatsApp number from the DB if it is not in the context
      const fetchUserProfile = async () => {
        const res = await getUsersAction();
        if (res.success && res.users) {
          const currentUser = res.users.find((u: any) => u.id === user.id);
          if (currentUser && currentUser.whatsapp) {
            setProfileWhatsapp(currentUser.whatsapp);
          }
        }
      };
      fetchUserProfile();
    }
  }, [user]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await getUsersAction();
      if (res.success && res.users) {
        setMembers(res.users);
      } else {
        setError(res.error || "Failed to load team members.");
      }
    } catch (err: any) {
      console.error("Load members error:", err);
      setError("Error loading directory.");
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadMetaSettings = async () => {
    try {
      setLoadingMeta(true);
      const res = await getMetaSettingsAction();
      if (res.success && res.config) {
        setMetaToken(res.config.accessToken);
        setMetaPhoneId(res.config.phoneNumberId);
        setMetaWabaId(res.config.wabaId);
        setMetaVerifyToken(res.config.verifyToken);
        setMetaPixelId(res.config.pixelId);

        if (res.config.accessToken && res.config.wabaId) {
          const tempRes = await getMetaTemplatesAction();
          if (tempRes.success && tempRes.templates) {
            setMetaTemplates(tempRes.templates);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load Meta settings:", err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadSharedAssets = async () => {
    try {
      setLoadingAssets(true);
      const res = await getSharedAssetsAction();
      if (res.success && res.assets) {
        setAssets(res.assets as any);
      }
    } catch (err) {
      console.error("Failed to load shared assets:", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadMembers();
      loadMetaSettings();
      loadSharedAssets();
    } else if (isManager && canManageTeam) {
      loadMembers();
    }
  }, [isSuperAdmin, isManager, canManageTeam]);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingProfile(true);
      setProfileSuccess(false);
      setProfileError(null);

      const res = await updateUserProfileAction(user.id, {
        name: profileName,
        whatsapp: profileWhatsapp || null,
        avatarUrl: profileAvatar || null,
      });

      if (res.success) {
        updateUser({
          name: profileName,
          avatarUrl: profileAvatar || null,
        });
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      } else {
        setProfileError(res.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setProfileError(err.message || "Error updating profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All fields are required.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    try {
      setUpdatingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(false);
      const res = await changePasswordAction(user.id, currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(res.error || "Failed to update password.");
      }
    } catch (err: any) {
      setPasswordError(err.message || "Error updating password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle Profile Avatar Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isForMemberModal = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (isForMemberModal) {
        setModalUploadingAvatar(true);
      } else {
        setUploadingAvatar(true);
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        if (isForMemberModal) {
          setFormAvatar(data.url);
        } else {
          setProfileAvatar(data.url);
        }
      } else {
        alert(data.error || "Failed to upload image.");
      }
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      if (isForMemberModal) {
        setModalUploadingAvatar(false);
      } else {
        setUploadingAvatar(false);
      }
    }
  };

  // Handle Asset Upload
  const handleAssetUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = assetFileInputRef.current;
    const file = fileInput?.files?.[0];
    if (!file) {
      setAssetUploadError("Please select a file to upload.");
      return;
    }

    try {
      setUploadingAsset(true);
      setAssetUploadError(null);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }

      // Create Shared Asset entry in DB
      const dbRes = await createSharedAssetAction({
        name: assetName.trim() || file.name,
        category: assetCategory,
        url: uploadData.url,
        mimeType: uploadData.mimeType,
        fileSize: uploadData.size,
      });

      if (dbRes.success) {
        setAssetName("");
        if (fileInput) fileInput.value = "";
        loadSharedAssets();
      } else {
        throw new Error(dbRes.error || "Failed to save asset metadata.");
      }
    } catch (err: any) {
      setAssetUploadError(err.message || "Error uploading asset.");
    } finally {
      setUploadingAsset(false);
    }
  };

  // Handle Asset Delete
  const handleDeleteAsset = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the asset "${name}"?`)) {
      return;
    }
    try {
      const res = await deleteSharedAssetAction(id);
      if (res.success) {
        loadSharedAssets();
      } else {
        alert(res.error || "Failed to delete asset.");
      }
    } catch (err: any) {
      alert("Error deleting asset: " + err.message);
    }
  };

  const copyAssetUrl = (url: string, assetId: string) => {
    const absoluteUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(absoluteUrl);
    setCopiedId(assetId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Meta Settings Save
  const handleSaveMetaSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMeta(true);
      setMetaSuccess(false);
      const res = await saveMetaSettingsAction({
        accessToken: metaToken,
        phoneNumberId: metaPhoneId,
        wabaId: metaWabaId,
        verifyToken: metaVerifyToken,
        pixelId: metaPixelId,
      });

      if (res.success) {
        setMetaSuccess(true);
        if (metaToken && metaWabaId) {
          const tempRes = await getMetaTemplatesAction();
          if (tempRes.success && tempRes.templates) {
            setMetaTemplates(tempRes.templates);
          }
        }
        setTimeout(() => setMetaSuccess(false), 3000);
      } else {
        alert(res.error || "Failed to save Meta settings");
      }
    } catch (err: any) {
      alert("Error saving Meta settings: " + err.message);
    } finally {
      setSavingMeta(false);
    }
  };

  // Open modal for add member
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormName("");
    setFormEmail("");
    setFormRole("AGENT");
    setFormAvatar("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");
    setFormWhatsapp("");
    setFormPassword("");
    setFormCanViewTeamChats(false);
    setFormCanManageTeam(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit member
  const handleOpenEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setFormAvatar(member.avatarUrl || "");
    setFormWhatsapp(member.whatsapp || "");
    setFormPassword("");
    
    if (member.permissions) {
      try {
        const perms = JSON.parse(member.permissions);
        setFormCanViewTeamChats(!!perms.canViewTeamChats);
        setFormCanManageTeam(!!perms.canManageTeam);
      } catch (e) {
        setFormCanViewTeamChats(false);
        setFormCanManageTeam(false);
      }
    } else {
      setFormCanViewTeamChats(false);
      setFormCanManageTeam(false);
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit Member Form
  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !user) {
      setModalError("Name and email are required.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      const permissionsJson = JSON.stringify({
        canViewTeamChats: formRole === "SUPERADMIN" ? true : (formRole === "MANAGER" ? formCanViewTeamChats : false),
        canManageTeam: formRole === "SUPERADMIN" ? true : (formRole === "MANAGER" ? formCanManageTeam : false),
      });

      const res = await upsertUserAction({
        id: editingMember?.id,
        name: formName,
        email: formEmail,
        password: formPassword || undefined,
        role: formRole,
        avatarUrl: formAvatar || null,
        whatsapp: formWhatsapp || null,
        permissions: permissionsJson,
      }, user.id);

      if (res.success) {
        setIsModalOpen(false);
        loadMembers();
      } else {
        setModalError(res.error || "Failed to save team member.");
      }
    } catch (err: any) {
      setModalError("Error submitting form: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete team member
  const handleDeleteMember = async (id: string, name: string) => {
    if (!user) return;
    if (id === user.id) {
      alert("Security Constraint: You cannot delete your own SuperAdmin account!");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete team member "${name}"? This will set all of their assigned leads to unassigned.`)) {
      return;
    }

    try {
      const res = await deleteUserAction(id, user.id);
      if (res.success) {
        loadMembers();
      } else {
        alert(res.error || "Failed to remove member.");
      }
    } catch (err: any) {
      alert("Error removing member: " + err.message);
    }
  };

  if (!user) return null;

  // Navigation tabs helper
  const tabs = [
    { id: "profile", name: "My Profile", icon: UserIcon, visible: true },
    { id: "assets", name: "Shared Assets Library", icon: FolderOpen, visible: isSuperAdmin },
    { id: "team", name: "Team Directory", icon: Users, visible: isSuperAdmin || (isManager && canManageTeam) },
    { id: "meta", name: "Meta Integration", icon: Settings, visible: isSuperAdmin },
    { id: "system", name: "System Admin", icon: ShieldCheck, visible: isSuperAdmin },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Account & System Settings
          </h2>
          <p className="text-sm text-slate-400">
            Manage your profile, configure system integrations, and organize shared marketing materials.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
          {tabs.filter((t: any) => t.visible).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
                  active
                    ? "bg-slate-900 border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-250 hover:bg-slate-900/40"
                }`}
              >
                <Icon size={14} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Content */}
        <div className="space-y-6">
          
          {/* TAB 1: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md max-w-2xl">
              <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3 mb-6">
                <UserIcon size={20} />
                <h3 className="text-base font-bold text-slate-200">My Profile Settings</h3>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Avatar Upload Container */}
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-slate-750 bg-slate-950 flex items-center justify-center relative animate-fadeIn">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt={profileName} className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-10 w-10 text-slate-600" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Upload size={16} className="text-white mb-1" />
                        <span className="text-[9px] text-white font-bold uppercase tracking-wider">Upload</span>
                      </div>

                      {/* Uploading Loader */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center rounded-full">
                          <Loader2 size={20} className="animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={(e) => handleAvatarFileChange(e, false)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-slate-200">{profileName || "Your Name"}</h4>
                    <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider text-blue-400">{user.role}</p>
                    <p className="text-[11px] text-slate-500">Click the avatar to upload a custom profile picture. Recommended 1:1 ratio.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Corporate Email (Non-Editable)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-550 cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Personal WhatsApp Number (with country code)
                    </label>
                    <input
                      type="text"
                      value={profileWhatsapp}
                      onChange={(e) => setProfileWhatsapp(e.target.value)}
                      placeholder="e.g. +15550199"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {profileError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
                    {profileError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Profile Changes
                  </button>

                  {profileSuccess && (
                    <span className="text-xs font-semibold text-emerald-400 animate-pulse">
                      Profile updated successfully!
                    </span>
                  )}
                </div>
              </form>

              {/* Change Password Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md max-w-2xl mt-6">
                <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3 mb-6">
                  <Lock size={20} />
                  <h3 className="text-base font-bold text-slate-200">Change Password</h3>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <div>
                       <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                         New Password
                       </label>
                       <input
                         type="password"
                         required
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         placeholder="••••••••"
                         className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                       />
                     </div>

                     <div>
                       <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                         Confirm New Password
                       </label>
                       <input
                         type="password"
                         required
                         value={confirmNewPassword}
                         onChange={(e) => setConfirmNewPassword(e.target.value)}
                         placeholder="••••••••"
                         className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                       />
                     </div>
                  </div>

                  {passwordError && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
                      {passwordError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all disabled:opacity-50"
                    >
                      {updatingPassword ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Update Password
                    </button>

                    {passwordSuccess && (
                      <span className="text-xs font-semibold text-emerald-400 animate-pulse">
                        Password updated successfully!
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: SHARED ASSETS LIBRARY */}
          {activeTab === "assets" && isSuperAdmin && (
            <div className="space-y-6 animate-fadeIn">
              {/* Asset Upload Form */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 text-emerald-450 border-b border-slate-800 pb-3 mb-6">
                  <Upload size={20} />
                  <h3 className="text-base font-bold text-slate-200">Upload Shared Marketing Assets</h3>
                </div>

                <form onSubmit={handleAssetUpload} className="grid grid-cols-1 gap-6 md:grid-cols-3 items-end">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Asset / Project Name
                    </label>
                    <input
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder="e.g. Homestead Tower Brochure"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Asset Category
                    </label>
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value)}
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="BROCHURE_PDF">Brochure (PDF)</option>
                      <option value="PROJECT">Project Info / Deck</option>
                      <option value="INVENTORY">Inventory List / Sheet</option>
                      <option value="VIDEO">Video Walkthrough / Clip</option>
                      <option value="PICTURE">Picture / Photo</option>
                      <option value="VISUAL">Visual Render / Artwork</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Select File
                      </label>
                      <input
                        type="file"
                        ref={assetFileInputRef}
                        required
                        className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-800 file:text-slate-250 hover:file:bg-slate-700 cursor-pointer"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingAsset}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md disabled:opacity-50 transition-all shrink-0"
                    >
                      {uploadingAsset ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Upload Asset
                    </button>
                  </div>
                </form>

                {assetUploadError && (
                  <div className="mt-4 rounded bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                    {assetUploadError}
                  </div>
                )}
              </div>

              {/* Assets Grid */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3 mb-6">
                  <FolderOpen size={20} />
                  <h3 className="text-base font-bold text-slate-200">Shared Assets Library</h3>
                </div>

                {loadingAssets ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-12 text-slate-550">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No assets uploaded yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {assets.map((asset) => {
                      const isPdf = asset.mimeType?.includes("pdf");
                      const isVideo = asset.mimeType?.includes("video");
                      const isImage = asset.mimeType?.includes("image");
                      
                      return (
                        <div key={asset.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="p-2.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                              {isPdf ? (
                                <FileText className="h-5 w-5 text-rose-400" />
                              ) : isVideo ? (
                                <Video className="h-5 w-5 text-sky-400" />
                              ) : isImage ? (
                                <ImageIcon className="h-5 w-5 text-emerald-450" />
                              ) : (
                                <File className="h-5 w-5 text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-xs text-slate-200 truncate" title={asset.name}>
                                {asset.name}
                              </h4>
                              <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400 mt-1">
                                {asset.category.replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-550 pt-2 border-t border-slate-900/50">
                            <span>{(asset.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => copyAssetUrl(asset.url, asset.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 py-1.5 text-[10px] font-bold border border-slate-800 transition-colors"
                            >
                              {copiedId === asset.id ? <Check size={11} className="text-emerald-450" /> : <Copy size={11} />}
                              {copiedId === asset.id ? "Copied!" : "Copy Link"}
                            </button>
                            
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 transition-colors"
                              title="View file"
                            >
                              <Globe size={13} />
                            </a>

                            <button
                              onClick={() => handleDeleteAsset(asset.id, asset.name)}
                              className="inline-flex items-center justify-center p-1.5 rounded bg-slate-900 hover:bg-rose-950 hover:text-rose-450 text-rose-500 border border-slate-800 transition-colors"
                              title="Delete asset"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TEAM DIRECTORY */}
          {activeTab === "team" && (isSuperAdmin || (isManager && canManageTeam)) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md space-y-6 animate-fadeIn">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-emerald-450">
                  <Users size={20} />
                  <h3 className="text-base font-bold text-slate-200">Team Directory & Access Control</h3>
                </div>
                <button
                  onClick={handleOpenAddModal}
                  id="add-member-btn"
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
                >
                  <Plus size={16} />
                  Add Team Member
                </button>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400">
                  {error}
                </div>
              )}

              {loadingMembers && members.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="overflow-x-auto animate-fadeIn">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/20 font-semibold text-slate-400">
                        <th className="px-6 py-3">Member</th>
                        <th className="px-6 py-3">WhatsApp Number</th>
                        <th className="px-6 py-3">Role Level</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                                alt={member.name}
                                className="h-8 w-8 rounded-full border border-slate-800 object-cover"
                              />
                              <div>
                                <div className="font-semibold text-slate-200 text-sm">{member.name}</div>
                                <div className="text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                                  <Mail size={12} className="text-slate-550" />
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            {member.whatsapp ? (
                              <a
                                href={`https://wa.me/${member.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-450 hover:text-emerald-400 font-medium transition-colors"
                              >
                                <span>{member.whatsapp}</span>
                              </a>
                            ) : (
                              <span className="text-slate-550 italic">Not configured</span>
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                                member.role === "SUPERADMIN"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : member.role === "MANAGER"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-emerald-500/10 text-emerald-450 border-emerald-500/20"
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>

                          <td className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(member)}
                                className="edit-member-btn p-1.5 rounded bg-slate-800 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400 border border-slate-700 transition-colors"
                                title="Edit Member"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id, member.name)}
                                disabled={member.id === user.id}
                                className="delete-member-btn p-1.5 rounded bg-slate-800 text-rose-400 hover:bg-rose-500/10 hover:text-rose-350 border border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Remove Member"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: META INTEGRATION */}
          {activeTab === "meta" && isSuperAdmin && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3">
                <Settings size={20} />
                <h3 className="text-base font-bold text-slate-200">Meta Integration (WhatsApp & Pixel)</h3>
              </div>

              <form onSubmit={handleSaveMetaSettings} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Meta System User Access Token
                    </label>
                    <input
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="EAA..."
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      WhatsApp Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      placeholder="e.g. 109834571938241"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      WhatsApp Business Account (WABA) ID
                    </label>
                    <input
                      type="text"
                      value={metaWabaId}
                      onChange={(e) => setMetaWabaId(e.target.value)}
                      placeholder="e.g. 209184572938401"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Webhook Verify Token
                    </label>
                    <input
                      type="text"
                      value={metaVerifyToken}
                      onChange={(e) => setMetaVerifyToken(e.target.value)}
                      placeholder="e.g. meta_crm_verify_token"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Meta Pixel ID
                    </label>
                    <input
                      type="text"
                      value={metaPixelId}
                      onChange={(e) => setMetaPixelId(e.target.value)}
                      placeholder="e.g. 92837492834"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={savingMeta}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all disabled:opacity-50"
                    >
                      {savingMeta ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Meta Settings
                    </button>

                    {metaSuccess && (
                      <span className="text-xs font-semibold text-emerald-450 animate-pulse">
                        Settings saved successfully!
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {metaTemplates.length > 0 && (
                <div className="mt-6 border-t border-slate-800 pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-450">
                    <MessageSquare size={16} />
                    <h4 className="text-xs font-bold text-slate-400">Approved Message Templates</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {metaTemplates.map((tpl: any) => (
                      <div key={tpl.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[11px] text-blue-400 truncate max-w-[70%]">{tpl.name}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {tpl.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">Category: {tpl.category}</span>
                        <span className="text-[10px] text-slate-400 block">Language: {tpl.language}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SYSTEM ADMIN */}
          {activeTab === "system" && isSuperAdmin && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 animate-fadeIn">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3">
                  <HardDrive size={20} />
                  <h3 className="text-base font-bold text-slate-200">Database Engine</h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Provider</span>
                    <span className="font-semibold text-slate-200">SQLite Client (Prisma 7.8.0)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database Location</span>
                    <span className="font-semibold text-slate-200">D:\CRM\dev.db</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auto Backup</span>
                    <span className="font-semibold text-emerald-400">Enabled (Every 24 hours)</span>
                  </div>
                </div>

                <button className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-[0.98]">
                  <RefreshCw size={14} />
                  Trigger DB Backup
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 text-rose-400 border-b border-slate-800 pb-3">
                  <Lock size={20} />
                  <h3 className="text-base font-bold text-slate-200">Security Policies</h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Session Expiry</span>
                    <span className="font-semibold text-slate-200">12 Hours (Active Session)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Role Verification Level</span>
                    <span className="font-semibold text-slate-200">Strict (Front-end context & server check)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attribution Trace ID</span>
                    <span className="font-semibold text-slate-200">Mandatory for all meta/google integrations</span>
                  </div>
                </div>

                <button className="mt-2 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 shadow-md transition-all active:scale-[0.98]">
                  <Save size={14} />
                  Commit Security Settings
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* User Form Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-400" />
                {editingMember ? "Edit Team Member" : "Add Team Member"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitMember} className="space-y-4">
              {/* Upload member photo inside modal */}
              <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
                  {formAvatar ? (
                    <img src={formAvatar} alt="Member Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-slate-500" />
                  )}
                  {modalUploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center rounded-full">
                      <Loader2 size={12} className="animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Member Photo</span>
                  <input
                    type="file"
                    ref={memberAvatarInputRef}
                    onChange={(e) => handleAvatarFileChange(e, true)}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => memberAvatarInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Upload size={10} />
                    Upload Photo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Member Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Corporate Email *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. sarah.c@homestead.com"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  WhatsApp Number (with Country Code)
                </label>
                <input
                  type="text"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="e.g. +15550199 or 15550199"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {editingMember ? "Password (Leave blank to keep current)" : "Password *"}
                </label>
                <input
                  type="password"
                  required={!editingMember}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingMember ? "••••••••" : "e.g. password123"}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Access Role Level
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-blue-500 focus:outline-none"
                >
                  <option value="SUPERADMIN">SuperAdmin (Full System Access)</option>
                  <option value="MANAGER">Manager (Reporting & Assignment)</option>
                  <option value="AGENT">Agent (Assigned Leads Only)</option>
                </select>
              </div>

              {formRole === "MANAGER" && (
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2.5 animate-fadeIn">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Manager Permissions
                  </span>
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={formCanViewTeamChats}
                      onChange={(e) => setFormCanViewTeamChats(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Can view other team members' chats</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={formCanManageTeam}
                      onChange={(e) => setFormCanManageTeam(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Can manage team members and assign roles</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Or Avatar Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/... or blank"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

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
                  disabled={modalLoading || modalUploadingAvatar}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md disabled:opacity-50 transition-colors"
                >
                  {modalLoading && <Loader2 size={12} className="animate-spin" />}
                  {editingMember ? "Save Changes" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
