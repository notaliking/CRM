"use client";

import React, { useState, useEffect, useRef } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAuth } from "@/components/AuthProvider";
import {
  getLeadsAction, 
  getLeadMessagesAction, 
  sendMessageAction, 
  generateAiSuggestionAction, 
  updateLeadStatusAction,
  getMemberWhatsappChatsAction,
  sendWhatsappMessageAction,
  addLeadNoteAction,
  getLeadNotesAction,
  createLeadTaskAction,
  getLeadTasksAction,
  completeLeadTaskAction,
  toggleWhatsappLeadAction,
  getSharedAssetsAction,
  upsertLeadAction,
  getUsersAction
} from "@/app/actions";
import { 
  Send, 
  User as UserIcon, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Info,
  UserCheck,
  Plus,
  CheckSquare,
  FileText,
  Calendar,
  CheckCircle2,
  Tag,
  HelpCircle,
  Paperclip,
  Search,
  X,
  Video,
  Image as ImageIcon,
  File,
  Filter
} from "lucide-react";

// Helper to cleanly format phone numbers
function formatPhoneNumber(phone: string | null | undefined) {
  if (!phone) return "No phone number";
  const cleaned = phone.replace(/\D/g, "");
  return `+${cleaned}`;
}

export default function ChatsPage() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isManager = user?.role === "MANAGER";
  let canViewTeamChats = false;
  if (user?.permissions) {
    try {
      const perms = JSON.parse(user.permissions);
      canViewTeamChats = !!perms.canViewTeamChats;
    } catch (e) {}
  }
  
  // Tabs: "leads" | "whatsapp"
  const [activeTab, setActiveTab] = useState<"leads" | "whatsapp">("leads");
  
  // Lists
  const [leads, setLeads] = useState<any[]>([]);
  const [whatsappChats, setWhatsappChats] = useState<any[]>([]);

  // Member Selector for SuperAdmin/Manager
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("ALL");

  const filteredLeads = leads.filter((lead) => {
    if (selectedMemberId === "ALL") return true;
    return lead.assignedAgentId === selectedMemberId;
  });

  const filteredWhatsappChats = whatsappChats.filter((chat) => {
    if (selectedMemberId === "ALL") return true;
    return chat.userId === selectedMemberId;
  });
  
  // Selection
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedWhatsappChatId, setSelectedWhatsappChatId] = useState<string | null>(null);
  
  // Messages & Inputs
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Shared Assets & Suggestions
  const [assets, setAssets] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showAssetPopover, setShowAssetPopover] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [selectedAssetCategory, setSelectedAssetCategory] = useState("ALL");
  
  // Right Pane Details
  const [recognizedLead, setRecognizedLead] = useState<any | null>(null);
  const [leadNotes, setLeadNotes] = useState<any[]>([]);
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  
  // Quick forms
  const [noteContent, setNoteContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  
  // Conversion Form (For WhatsApp contacts)
  const [convertName, setConvertName] = useState("");
  const [convertPhone, setConvertPhone] = useState("");
  const [convertEmail, setConvertEmail] = useState("");
  const [convertStatus, setConvertStatus] = useState("QUEUED");
  const [convertSource, setConvertSource] = useState("WhatsApp Business");

  // Inline Profile Edit State (For registered leads)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfileEdit, setSavingProfileEdit] = useState(false);

  // Loading & Action States
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [togglingLead, setTogglingLead] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);
  const prevLastMessageId = useRef("");
  
  const currentChat = whatsappChats.find(c => c.id === selectedWhatsappChatId);

  // Fetch assets
  const loadAssets = async () => {
    const res = await getSharedAssetsAction();
    if (res.success && res.assets) {
      setAssets(res.assets);
    }
  };

  // Fetch leads and WhatsApp chats on mount / user change
  const loadInitialData = async () => {
    if (!user) return;
    
    // Load Leads
    setLoadingLeads(true);
    const leadsRes = await getLeadsAction(user.role, user.id, {
      status: "ALL",
      source: "ALL",
    }); 
    if (leadsRes.success && leadsRes.leads) {
      setLeads(leadsRes.leads);
    }
    setLoadingLeads(false);

    // Load WhatsApp Chats
    setLoadingWhatsapp(true);
    const wpRes = await getMemberWhatsappChatsAction(user.id, user.role);
    if (wpRes.success && wpRes.chats) {
      setWhatsappChats(wpRes.chats);
    }
    setLoadingWhatsapp(false);

    // Load Members if SuperAdmin or Manager with team view permission
    if (isSuperAdmin || (isManager && canViewTeamChats)) {
      const usersRes = await getUsersAction();
      if (usersRes.success && usersRes.users) {
        if (isManager) {
          setMembers(usersRes.users.filter((u: any) => u.role !== "SUPERADMIN"));
        } else {
          setMembers(usersRes.users);
        }
      }
    }

    // Load Shared Assets
    loadAssets();
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Periodic polling for updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      // Refresh Lists silently
      const leadsRes = await getLeadsAction(user.role, user.id, { status: "ALL", source: "ALL" });
      if (leadsRes.success && leadsRes.leads) {
        setLeads(leadsRes.leads);
      }

      const wpRes = await getMemberWhatsappChatsAction(user.id, user.role);
      if (wpRes.success && wpRes.chats) {
        setWhatsappChats(wpRes.chats);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Load messages & details when a Lead is selected
  useEffect(() => {
    if (activeTab !== "leads" || !selectedLeadId) return;
    
    const currentLead = leads.find(l => l.id === selectedLeadId);

    async function loadLeadMessagesAndDetails() {
      setLoadingMessages(true);
      setLoadingDetails(true);
      
      if (currentLead) {
        setRecognizedLead(currentLead);
        setEditName(currentLead.name);
        setEditPhone(currentLead.phone || "");
        setEditEmail(currentLead.email || "");
        setIsEditingProfile(false);
        
        // Check if there is a matching WhatsApp chat
        const cleanPhone = currentLead.phone?.replace(/\D/g, "");
        const matchingWpChat = cleanPhone 
          ? whatsappChats.find(c => c.contactPhone.replace(/\D/g, "") === cleanPhone)
          : null;

        if (matchingWpChat) {
          try {
            const parsed = JSON.parse(matchingWpChat.messages);
            const formatted = parsed.map((m: any, index: number) => ({
              id: `wp-${index}`,
              content: m.text,
              isFromLead: m.sender === "lead",
              createdAt: m.time || new Date().toISOString()
            }));
            setMessages(formatted);
          } catch (e) {
            setMessages([]);
          }
        } else {
          // Load CRM messages
          const msgRes = await getLeadMessagesAction(selectedLeadId!);
          if (msgRes.success && msgRes.messages) {
            setMessages(msgRes.messages);
          }
        }
      }
      
      // Load notes
      const notesRes = await getLeadNotesAction(selectedLeadId!);
      if (notesRes.success && notesRes.notes) {
        setLeadNotes(notesRes.notes);
      }

      // Load tasks
      const tasksRes = await getLeadTasksAction(selectedLeadId!);
      if (tasksRes.success && tasksRes.tasks) {
        setLeadTasks(tasksRes.tasks);
      }

      setLoadingMessages(false);
      setLoadingDetails(false);
    }

    loadLeadMessagesAndDetails();

    // Poll messages for active lead
    const msgInterval = setInterval(async () => {
      if (currentLead) {
        const cleanPhone = currentLead.phone?.replace(/\D/g, "");
        const matchingWpChat = cleanPhone 
          ? whatsappChats.find(c => c.contactPhone.replace(/\D/g, "") === cleanPhone)
          : null;

        if (matchingWpChat) {
          try {
            const parsed = JSON.parse(matchingWpChat.messages);
            const formatted = parsed.map((m: any, index: number) => ({
              id: `wp-${index}`,
              content: m.text,
              isFromLead: m.sender === "lead",
              createdAt: m.time || new Date().toISOString()
            }));
            setMessages(formatted);
          } catch (e) {}
          return;
        }
      }

      const msgRes = await getLeadMessagesAction(selectedLeadId!);
      if (msgRes.success && msgRes.messages) {
        setMessages(msgRes.messages);
      }
    }, 3000);

    return () => clearInterval(msgInterval);
  }, [selectedLeadId, activeTab, leads, whatsappChats]);

  // Load messages & details when a WhatsApp Chat is selected
  useEffect(() => {
    if (activeTab !== "whatsapp" || !selectedWhatsappChatId) return;

    if (!currentChat) return;

    // Load WhatsApp messages from JSON string
    try {
      const parsed = JSON.parse(currentChat.messages);
      const formatted = parsed.map((m: any, index: number) => ({
        id: `wp-${index}`,
        content: m.text,
        isFromLead: m.sender === "lead",
        createdAt: m.time || new Date().toISOString()
      }));
      setMessages(formatted);
    } catch (e) {
      setMessages([]);
    }

    // Auto-recognize lead in database by matching phone number
    async function autoRecognizeLead() {
      setLoadingDetails(true);
      const cleanPhone = currentChat.contactPhone.replace(/\D/g, "");
      
      const matched = leads.find(l => {
        if (!l.phone) return false;
        return l.phone.replace(/\D/g, "") === cleanPhone;
      });

      if (matched) {
        setRecognizedLead(matched);
        setEditName(matched.name);
        setEditPhone(matched.phone || "");
        setEditEmail(matched.email || "");
        setIsEditingProfile(false);
        
        // Fetch notes & tasks
        const notesRes = await getLeadNotesAction(matched.id);
        if (notesRes.success && notesRes.notes) {
          setLeadNotes(notesRes.notes);
        }
        const tasksRes = await getLeadTasksAction(matched.id);
        if (tasksRes.success && tasksRes.tasks) {
          setLeadTasks(tasksRes.tasks);
        }
      } else {
        setRecognizedLead(null);
        setLeadNotes([]);
        setLeadTasks([]);
        setConvertName(currentChat.contactName);
        setConvertPhone(currentChat.contactPhone);
        setConvertEmail("");
      }
      setLoadingDetails(false);
    }

    autoRecognizeLead();

    // Poll messages for active WhatsApp chat
    const wpInterval = setInterval(async () => {
      const wpRes = await getMemberWhatsappChatsAction(user?.id || "", user?.role);
      if (wpRes.success && wpRes.chats) {
        const updatedChat = wpRes.chats.find(c => c.id === selectedWhatsappChatId);
        if (updatedChat) {
          try {
            const parsed = JSON.parse(updatedChat.messages);
            const formatted = parsed.map((m: any, index: number) => ({
              id: `wp-${index}`,
              content: m.text,
              isFromLead: m.sender === "lead",
              createdAt: m.time || new Date().toISOString()
            }));
            setMessages(formatted);
          } catch (e) {}
        }
      }
    }, 3000);

    return () => clearInterval(wpInterval);
  }, [selectedWhatsappChatId, activeTab, whatsappChats, leads]);

  // Auto-suggest assets based on the last message
  useEffect(() => {
    if (messages.length === 0 || assets.length === 0) {
      setSuggestions([]);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    // Only suggest if the last message is from the lead
    if (!lastMsg.isFromLead) {
      setSuggestions([]);
      return;
    }

    const text = lastMsg.content.toLowerCase();
    const matched: any[] = [];

    // Keyword matching
    const matchesKeyword = (asset: any) => {
      // Direct name matches
      const nameMatch = asset.name.toLowerCase().split(/[_\s-]/).some((word: string) => {
        return word.length > 2 && text.includes(word);
      });
      if (nameMatch) return true;

      // Category matches based on keywords
      if (text.includes("brochure") || text.includes("pdf") || text.includes("document")) {
        if (asset.category === "BROCHURE_PDF") return true;
      }
      if (text.includes("video") || text.includes("walkthrough") || text.includes("clip") || text.includes("tour")) {
        if (asset.category === "VIDEO") return true;
      }
      if (text.includes("photo") || text.includes("picture") || text.includes("image") || text.includes("visual") || text.includes("render")) {
        if (asset.category === "PICTURE" || asset.category === "VISUAL") return true;
      }
      if (text.includes("project") || text.includes("deck") || text.includes("details")) {
        if (asset.category === "PROJECT") return true;
      }
      if (text.includes("inventory") || text.includes("sheet") || text.includes("price") || text.includes("availab")) {
        if (asset.category === "INVENTORY") return true;
      }
      return false;
    };

    assets.forEach((asset) => {
      if (matchesKeyword(asset)) {
        matched.push(asset);
      }
    });

    setSuggestions(matched.slice(0, 5));
  }, [messages, assets]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const hasNewMessage = messages.length !== prevMessagesLength.current || 
                         lastMsg.id !== prevLastMessageId.current;
    
    if (hasNewMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessagesLength.current = messages.length;
      prevLastMessageId.current = lastMsg.id;
    }
  }, [messages]);

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    setNewMessage("");
    setSending(true);

    if (activeTab === "leads" && selectedLeadId) {
      const currentLead = leads.find(l => l.id === selectedLeadId);
      const cleanPhone = currentLead?.phone?.replace(/\D/g, "");
      const matchingWpChat = cleanPhone 
        ? whatsappChats.find(c => c.contactPhone.replace(/\D/g, "") === cleanPhone)
        : null;

      if (matchingWpChat) {
        const tempMsg = {
          id: "temp-wp-" + Date.now(),
          content,
          isFromLead: false,
          createdAt: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempMsg]);

        const res = await sendWhatsappMessageAction(matchingWpChat.id, content);
        if (!res.success) {
          alert("Failed to send WhatsApp message: " + res.error);
        } else {
          // Also save in CRM message table for record-keeping
          await sendMessageAction(selectedLeadId, content, user?.id || null, false);
          
          // Refresh WhatsApp chats
          const wpRes = await getMemberWhatsappChatsAction(user?.id || "", user?.role);
          if (wpRes.success && wpRes.chats) {
            setWhatsappChats(wpRes.chats);
          }
        }
      } else {
        const tempMsg = {
          id: "temp-" + Date.now(),
          content,
          isFromLead: false,
          senderId: user?.id,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMsg]);

        const res = await sendMessageAction(selectedLeadId, content, user?.id || null, false);
        if (!res.success) {
          alert("Failed to send message: " + res.error);
        } else {
          const refreshRes = await getLeadMessagesAction(selectedLeadId);
          if (refreshRes.success && refreshRes.messages) {
            setMessages(refreshRes.messages);
          }
        }
      }
    } else if (activeTab === "whatsapp" && selectedWhatsappChatId) {
      const tempMsg = {
        id: "temp-wp-" + Date.now(),
        content,
        isFromLead: false,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempMsg]);

      const res = await sendWhatsappMessageAction(selectedWhatsappChatId, content);
      if (!res.success) {
        alert("Failed to send WhatsApp message: " + res.error);
      } else {
        const wpRes = await getMemberWhatsappChatsAction(user?.id || "");
        if (wpRes.success && wpRes.chats) {
          setWhatsappChats(wpRes.chats);
        }
      }
    }
    setSending(false);
  };

  // Generate AI reply suggestion
  const handleAiSuggestion = async () => {
    let targetLeadId = selectedLeadId;
    if (activeTab === "whatsapp" && recognizedLead) {
      targetLeadId = recognizedLead.id;
    }

    if (!targetLeadId) {
      setGeneratingAi(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setNewMessage("Hi! Thanks for reaching out. How can I help you with our property listings today?");
      setGeneratingAi(false);
      return;
    }

    setGeneratingAi(true);
    const res = await generateAiSuggestionAction(targetLeadId);
    if (res.success && res.suggestion) {
      setNewMessage(res.suggestion);
    } else {
      alert("Failed to generate AI suggestion.");
    }
    setGeneratingAi(false);
  };

  // Insert asset link into input
  const handleInsertAsset = (asset: any) => {
    const assetUrl = `${window.location.origin}${asset.url}`;
    const insertText = `Here is the ${asset.name}: ${assetUrl}`;
    
    if (newMessage.trim()) {
      setNewMessage((prev) => `${prev}\n\n${insertText}`);
    } else {
      setNewMessage(insertText);
    }
    
    setShowAssetPopover(false);
    setAssetSearchQuery("");
  };

  // Update lead status (label)
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!recognizedLead) return;
    const newStatus = e.target.value;
    setUpdatingStatus(true);
    const res = await updateLeadStatusAction(recognizedLead.id, newStatus);
    if (res.success) {
      setLeads((prev) => 
        prev.map(l => l.id === recognizedLead.id ? { ...l, status: newStatus } : l)
      );
      setRecognizedLead((prev: any) => ({ ...prev, status: newStatus }));
    } else {
      alert("Failed to update status.");
    }
    setUpdatingStatus(false);
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recognizedLead || !noteContent.trim() || !user) return;

    setAddingNote(true);
    const res = await addLeadNoteAction(recognizedLead.id, user.id, user.name, noteContent);
    if (res.success && res.note) {
      setLeadNotes((prev) => [res.note, ...prev]);
      setNoteContent("");
    } else {
      alert("Failed to add note.");
    }
    setAddingNote(false);
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recognizedLead || !taskTitle.trim() || !taskDueDate || !user) return;

    setAddingTask(true);
    const res = await createLeadTaskAction(
      recognizedLead.id,
      user.id,
      taskTitle,
      new Date(taskDueDate)
    );
    if (res.success && res.task) {
      setLeadTasks((prev) => [...prev, res.task]);
      setTaskTitle("");
      setTaskDueDate("");
    } else {
      alert("Failed to create task.");
    }
    setAddingTask(false);
  };

  // Complete Task
  const handleCompleteTask = async (taskId: string) => {
    const res = await completeLeadTaskAction(taskId);
    if (res.success) {
      setLeadTasks((prev) => 
        prev.map(t => t.id === taskId ? { ...t, status: "COMPLETED" } : t)
      );
    } else {
      alert("Failed to complete task.");
    }
  };

  // Toggle WhatsApp Lead Status
  const handleToggleLeadStatus = async (isLead: boolean) => {
    let chatId = selectedWhatsappChatId;
    if (!chatId) return;

    setTogglingLead(true);
    const res = await toggleWhatsappLeadAction(
      chatId,
      isLead,
      isLead ? {
        name: convertName,
        phone: convertPhone,
        email: convertEmail || null,
        status: convertStatus,
        source: convertSource,
        assignedAgentId: user?.id,
      } : undefined
    );

    if (res.success) {
      if (isLead && res.lead) {
        setRecognizedLead(res.lead);
        // Refresh leads list
        const leadsRes = await getLeadsAction(user?.role || "AGENT", user?.id || "", { status: "ALL", source: "ALL" });
        if (leadsRes.success && leadsRes.leads) {
          setLeads(leadsRes.leads);
        }
      } else {
        setRecognizedLead(null);
        setLeadNotes([]);
        setLeadTasks([]);
      }
    } else {
      alert("Failed to update lead designation: " + res.error);
    }
    setTogglingLead(false);
  };

  // Save inline profile edits
  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recognizedLead || !editName.trim()) return;

    setSavingProfileEdit(true);
    const res = await upsertLeadAction({
      id: recognizedLead.id,
      name: editName,
      phone: editPhone || null,
      email: editEmail || null,
      source: recognizedLead.source,
      status: recognizedLead.status,
      assignedAgentId: recognizedLead.assignedAgentId,
      clickId: recognizedLead.clickId,
      preferredType: recognizedLead.preferredType,
      maxBudget: recognizedLead.maxBudget,
    });

    if (res.success && res.lead) {
      setLeads(prev => prev.map(l => l.id === recognizedLead.id ? { 
        ...l, 
        name: editName, 
        phone: editPhone || null, 
        email: editEmail || null 
      } : l));
      
      setRecognizedLead((prev: any) => ({
        ...prev,
        name: editName,
        phone: editPhone || null,
        email: editEmail || null,
      }));
      
      setIsEditingProfile(false);
    } else {
      alert("Failed to update profile: " + (res.error || "Unknown error"));
    }
    setSavingProfileEdit(false);
  };

  // Filtered Assets for manual attachment popover
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(assetSearchQuery.toLowerCase());
    const matchesCategory = selectedAssetCategory === "ALL" || asset.category === selectedAssetCategory;
    return matchesSearch && matchesCategory;
  });

  // Helpers for UI
  const isChatSelected = activeTab === "leads" ? !!selectedLeadId : !!selectedWhatsappChatId;
  const currentChatName = activeTab === "leads"
    ? leads.find(l => l.id === selectedLeadId)?.name
    : whatsappChats.find(c => c.id === selectedWhatsappChatId)?.contactName;

  const getConvoStartedDate = () => {
    if (messages.length === 0) return "N/A";
    return new Date(messages[0].createdAt).toLocaleDateString();
  };

  return (
    <SidebarLayout>
      <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
        
        {/* Left Pane - Tabs & Contacts Directory */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/20">
          {/* Dual Tabs Header */}
          <div className="grid grid-cols-2 p-3 gap-2 border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => {
                setActiveTab("leads");
                setMessages([]);
                setSelectedWhatsappChatId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === "leads"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/50"
              }`}
            >
              <MessageSquare size={14} />
              Leads Chat
            </button>
            <button
              onClick={() => {
                setActiveTab("whatsapp");
                setMessages([]);
                setSelectedLeadId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                activeTab === "whatsapp"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-400 hover:text-slate-250 hover:bg-slate-900/50"
              }`}
            >
              <Phone size={14} />
              WhatsApp
            </button>
          </div>

          {/* Member Selector for Admin/Manager */}
          {(isSuperAdmin || (isManager && canViewTeamChats)) && (
            <div className="p-3 border-b border-slate-800 bg-slate-950/40">
              <label htmlFor="memberSelect" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Filter by Team Member
              </label>
              <select
                id="memberSelect"
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  // Reset selections when switching filters
                  setSelectedLeadId(null);
                  setSelectedWhatsappChatId(null);
                  setMessages([]);
                }}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Directory Lists */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === "leads" ? (
              loadingLeads ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 italic">No leads assigned.</p>
              ) : (
                filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 ${
                      selectedLeadId === lead.id
                        ? "bg-blue-600/10 border-blue-500/40 text-white"
                        : "border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-850 border border-slate-750 flex items-center justify-center text-xs font-bold text-slate-300">
                      {lead.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-slate-200 truncate">{lead.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                        <span>{lead.source}</span>
                        <span className="uppercase font-bold text-[9px] text-blue-400">{lead.status}</span>
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : (
              loadingWhatsapp ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
              ) : filteredWhatsappChats.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 italic">No WhatsApp chats.</p>
              ) : (
                filteredWhatsappChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedWhatsappChatId(chat.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 ${
                      selectedWhatsappChatId === chat.id
                        ? "bg-emerald-600/10 border-emerald-500/40 text-white"
                        : "border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-850 border border-slate-750 flex items-center justify-center text-xs font-bold text-slate-300">
                      {chat.contactName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-slate-200 truncate">{chat.contactName}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {chat.user && (user?.role === "SUPERADMIN" || user?.role === "MANAGER") ? (
                          <span className="text-blue-400 font-bold mr-1">@{chat.user.name}:</span>
                        ) : null}
                        {chat.lastMessage || "No messages"}
                      </div>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Center Pane - Active Chat View */}
        <div className="flex-1 flex flex-col bg-slate-950/40 relative">
          {isChatSelected ? (
            <>
              {/* Chat Pane Header */}
              <div className="h-14 border-b border-slate-850 px-6 flex items-center justify-between bg-slate-950/10">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${activeTab === "whatsapp" ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <span className="font-bold text-sm text-slate-200">{currentChatName}</span>
                </div>
                {activeTab === "whatsapp" && !recognizedLead && (
                  <span className="text-[10px] font-bold text-amber-450 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                    Unregistered Lead
                  </span>
                )}
              </div>

              {/* Messages Board */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <MessageSquare size={32} className="opacity-10 mb-2" />
                    <p className="text-xs italic">No messages recorded in this timeline.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromLead ? "justify-start" : "justify-end"} animate-fadeIn`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                          msg.isFromLead
                            ? "bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800"
                            : activeTab === "whatsapp"
                            ? "bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-700/10"
                            : "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-700/10"
                        }`}
                      >
                        {msg.content}
                        <span className={`block text-[8px] mt-1.5 text-right ${msg.isFromLead ? "text-slate-550" : "text-white/60"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Popovers */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/80 relative">
                
                {/* Manual Asset Attachment Popover */}
                {showAssetPopover && (
                  <div className="absolute bottom-[calc(100%+10px)] right-4 left-4 max-w-md ml-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-4 z-20 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Paperclip size={12} className="text-blue-400" />
                        Attach Marketing Material
                      </span>
                      <button
                        onClick={() => {
                          setShowAssetPopover(false);
                          setAssetSearchQuery("");
                        }}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={assetSearchQuery}
                          onChange={(e) => setAssetSearchQuery(e.target.value)}
                          placeholder="Search assets..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Category Filters */}
                      <div className="flex flex-wrap gap-1 border-b border-slate-900 pb-2">
                        {["ALL", "BROCHURE_PDF", "PROJECT", "INVENTORY", "VIDEO", "PICTURE"].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedAssetCategory(cat)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                              selectedAssetCategory === cat
                                ? "bg-blue-600 text-white"
                                : "bg-slate-900 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {cat === "BROCHURE_PDF" ? "PDF" : cat}
                          </button>
                        ))}
                      </div>

                      {/* Assets List */}
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {filteredAssets.length === 0 ? (
                          <p className="text-[11px] text-slate-500 text-center py-4 italic">No matching assets found.</p>
                        ) : (
                          filteredAssets.map((asset) => {
                            const isPdf = asset.mimeType?.includes("pdf");
                            const isVideo = asset.mimeType?.includes("video");
                            const isImage = asset.mimeType?.includes("image");
                            
                            return (
                              <button
                                key={asset.id}
                                onClick={() => handleInsertAsset(asset)}
                                className="w-full text-left p-2 rounded bg-slate-900/50 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700 flex items-center justify-between text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span>{isPdf ? "📄" : isVideo ? "🎥" : isImage ? "🖼️" : "📁"}</span>
                                  <span className="font-medium text-slate-300 truncate">{asset.name}</span>
                                </div>
                                <span className="text-[9px] text-slate-500 uppercase font-semibold shrink-0">
                                  {asset.category.replace("_", " ")}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Automatic Suggestions Bar */}
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2.5 bg-slate-950/90 border-t border-x border-slate-800 rounded-t-xl animate-fadeIn mb-0.5">
                    <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 px-1 py-1">
                      <Sparkles size={11} className="animate-pulse" />
                      Suggested Assets:
                    </span>
                    {suggestions.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleInsertAsset(asset)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-blue-950/35 border border-slate-800 hover:border-blue-500/30 text-[11px] text-slate-300 transition-all active:scale-[0.98]"
                      >
                        <span>{asset.category === "BROCHURE_PDF" ? "📄" : asset.category === "VIDEO" ? "🎥" : "🖼️"}</span>
                        <span className="max-w-[150px] truncate font-medium">{asset.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Message Input Form */}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  {/* AI Suggestion Button */}
                  <button
                    type="button"
                    onClick={handleAiSuggestion}
                    disabled={generatingAi}
                    className="p-3 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-full transition-colors disabled:opacity-50"
                    title="Generate AI Suggestion"
                  >
                    {generatingAi ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </button>

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => setShowAssetPopover(!showAssetPopover)}
                    className={`p-3 rounded-full transition-colors relative ${
                      showAssetPopover ? "text-blue-400 bg-blue-500/10" : "text-slate-400 hover:text-slate-400 hover:bg-slate-850"
                    }`}
                    title="Attach Marketing Material"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  {/* Textarea */}
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={activeTab === "whatsapp" ? "Type a WhatsApp message..." : "Type a CRM message..."}
                      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-32 min-h-[44px]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className={`p-3 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"
                    }`}
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-550">
              <div className="text-center animate-fadeIn">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select a chat from the list to begin</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane - Client Details & Activity Panel */}
        <div className="w-80 flex-shrink-0 bg-slate-905/40 flex flex-col overflow-y-auto border-l border-slate-800">
          {isChatSelected ? (
            loadingDetails ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="p-4 space-y-6">
                
                {/* LEAD / NOT A LEAD OPTION (Only for WhatsApp Chats) */}
                {activeTab === "whatsapp" && (
                  <div className="space-y-2.5 pb-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                      Lead Designation
                    </h3>
                    
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">Is this contact a CRM Lead?</span>
                      <div className="flex rounded-md bg-slate-900 p-0.5 border border-slate-750">
                        <button
                          type="button"
                          onClick={() => handleToggleLeadStatus(true)}
                          disabled={togglingLead}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${
                            recognizedLead 
                              ? "bg-blue-600 text-white shadow-sm" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLeadStatus(false)}
                          disabled={togglingLead}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${
                            !recognizedLead 
                              ? "bg-rose-600/20 text-rose-450 border border-rose-500/20" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {/* Convert Lead Form (if not recognized yet) */}
                    {!recognizedLead && (
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 space-y-3 mt-2 animate-fadeIn">
                        <span className="block text-[10px] font-bold text-blue-400 uppercase">Lead Creation Details</span>
                        
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Name</label>
                          <input
                            type="text"
                            value={convertName}
                            onChange={e => setConvertName(e.target.value)}
                            className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                          <input
                            type="text"
                            value={convertPhone}
                            onChange={e => setConvertPhone(e.target.value)}
                            className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Email</label>
                          <input
                            type="email"
                            value={convertEmail}
                            onChange={e => setConvertEmail(e.target.value)}
                            placeholder="optional"
                            className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Status</label>
                            <select
                              value={convertStatus}
                              onChange={e => setConvertStatus(e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-blue-500"
                            >
                              <option value="QUEUED">Queue</option>
                              <option value="NEW">New</option>
                              <option value="CONTACTED">Contacted</option>
                              <option value="QUALIFIED">Qualified</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Source</label>
                            <select
                              value={convertSource}
                              onChange={e => setConvertSource(e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-blue-500"
                            >
                              <option value="WhatsApp Business">WhatsApp</option>
                              <option value="Meta Ads">Meta Ads</option>
                              <option value="Google Ads">Google Ads</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleLeadStatus(true)}
                          disabled={togglingLead || !convertName.trim()}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
                        >
                          Register Contact as CRM Lead
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Case A: Contact is a recognized Lead */}
                {recognizedLead ? (
                  <>
                    {/* Profile Summary */}
                    <div className="space-y-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-blue-400" />
                          Lead Profile
                        </h3>
                        {!isEditingProfile ? (
                          <button
                            onClick={() => setIsEditingProfile(true)}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>

                      {isEditingProfile ? (
                        <form onSubmit={handleSaveProfileEdit} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3 animate-fadeIn">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={e => setEditPhone(e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              placeholder="optional"
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsEditingProfile(false)}
                              className="flex-1 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded text-[10px] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={savingProfileEdit || !editName.trim()}
                              className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {savingProfileEdit && <Loader2 className="h-3 w-3 animate-spin" />}
                              Save
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
                          <div className="font-semibold text-slate-200 text-sm">{recognizedLead.name}</div>
                          
                          {recognizedLead.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span>{formatPhoneNumber(recognizedLead.phone)}</span>
                            </div>
                          )}
                          
                          {recognizedLead.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 overflow-hidden">
                              <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{recognizedLead.email}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>Convo: {getConvoStartedDate()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CRM Metadata */}
                    <div className="space-y-3 pb-4 border-b border-slate-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-blue-400" />
                        CRM Data
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-550 font-semibold">SOURCE</div>
                          <div className="font-semibold text-slate-300 truncate">{recognizedLead.source}</div>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-550 font-semibold">BUDGET</div>
                          <div className="font-semibold text-slate-300">
                            {recognizedLead.maxBudget ? `$${recognizedLead.maxBudget.toLocaleString()}` : "Not Set"}
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded border border-slate-800 col-span-2">
                          <div className="text-[10px] text-slate-550 font-semibold">PREFERRED PROPERTY</div>
                          <div className="font-semibold text-slate-300">{recognizedLead.preferredType || "Any / Undefined"}</div>
                        </div>
                        <div className="col-span-2 mt-1">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Lead Pipeline Status</label>
                          <select
                            value={recognizedLead.status}
                            onChange={handleStatusChange}
                            disabled={updatingStatus}
                            className="w-full rounded border border-slate-850 bg-slate-950 px-2 py-1.5 text-xs text-blue-400 font-bold focus:outline-none"
                          >
                            <option value="QUEUED">Queue</option>
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="QUALIFIED">Qualified</option>
                            <option value="WON">Won / Sold</option>
                            <option value="LOST">Lost</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-3 pb-4 border-b border-slate-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-450" />
                          Tasks
                        </span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold">
                          {leadTasks.filter(t => t.status === "PENDING").length} Pending
                        </span>
                      </h3>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {leadTasks.length === 0 ? (
                          <p className="text-xs text-slate-505 italic">No tasks created yet.</p>
                        ) : (
                          leadTasks.map(task => (
                            <div key={task.id} className="flex items-start justify-between p-2 bg-slate-900/50 rounded border border-slate-800 text-xs animate-fadeIn">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className={`font-medium ${task.status === "COMPLETED" ? "line-through text-slate-550" : "text-slate-300"}`}>
                                  {task.title}
                                </div>
                                <div className="text-[10px] text-slate-550 mt-0.5">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                              {task.status === "PENDING" && (
                                <button
                                  onClick={() => handleCompleteTask(task.id)}
                                  className="p-1 text-slate-400 hover:text-emerald-450 hover:bg-emerald-500/10 rounded transition-colors shrink-0"
                                  title="Mark complete"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handleAddTask} className="space-y-2 pt-1.5">
                        <input
                          type="text"
                          placeholder="Create a task..."
                          value={taskTitle}
                          onChange={e => setTaskTitle(e.target.value)}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-250 focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={taskDueDate}
                            onChange={e => setTaskDueDate(e.target.value)}
                            className="flex-1 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={addingTask || !taskTitle.trim() || !taskDueDate}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold disabled:opacity-50"
                          >
                            {addingTask ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Notes / Activity History */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-amber-450" />
                        Notes & Activity
                      </h3>
                      
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {leadNotes.length === 0 ? (
                          <p className="text-xs text-slate-505 italic">No notes recorded.</p>
                        ) : (
                          leadNotes.map(note => (
                            <div key={note.id} className="p-2.5 bg-slate-900/50 rounded border border-slate-800/80 text-xs space-y-1 animate-fadeIn">
                              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                              <div className="flex justify-between text-[9px] text-slate-550 pt-1 border-t border-slate-805/25">
                                <span>By {note.userName}</span>
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handleAddNote} className="pt-2">
                        <textarea
                          placeholder="Log an activity / note..."
                          value={noteContent}
                          onChange={e => setNoteContent(e.target.value)}
                          rows={2}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-250 focus:border-blue-500 focus:outline-none resize-none"
                        />
                        <button
                          type="submit"
                          disabled={addingNote || !noteContent.trim()}
                          className="w-full mt-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {addingNote ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Save Note"}
                        </button>
                      </form>
                    </div>
                  </>
                  ) : (
                    // Case B: Contact is NOT a Lead
                    <div className="space-y-6 animate-fadeIn">
                      {/* Profile Card */}
                      <div className="space-y-3 pb-4 border-b border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-blue-400" />
                          WhatsApp Contact
                        </h3>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
                          <div className="font-semibold text-slate-200 text-sm">
                            {currentChat?.contactName || "Unknown Contact"}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{formatPhoneNumber(currentChat?.contactPhone)}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="text-[11px]">Last Active: {currentChat ? new Date(currentChat.updatedAt).toLocaleDateString() : "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Traffic & Ad Attribution Section */}
                      <div className="space-y-3 pb-4 border-b border-slate-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-blue-400" />
                          Traffic & Ad Attribution
                        </h3>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Source Platform:</span>
                            <span className="font-semibold text-slate-300">WhatsApp Business</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Click / Ad ID:</span>
                            <span className="font-mono text-[10px] text-slate-400">Direct Message / No Pixel ID</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed pt-1.5 border-t border-slate-850">
                            To track ad conversions, assign custom properties, or log activities, register this contact as a CRM Lead.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-550">
              <span className="text-xs italic">Select a contact to view details</span>
            </div>
          )}
        </div>

      </div>
    </SidebarLayout>
  );
}
