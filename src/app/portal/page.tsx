"use client";

import React, { useEffect, useState, useRef } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAuth } from "@/components/AuthProvider";
import {
  getUsersAction,
  connectMemberWhatsappAction,
  disconnectMemberWhatsappAction,
  getMemberWhatsappChatsAction,
  sendWhatsappMessageAction,
} from "@/app/actions";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Smartphone,
  RefreshCw,
  Loader2,
  AlertCircle,
  User as UserIcon,
  X,
} from "lucide-react";

export default function MembersPortalPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection Modal
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectingMember, setConnectingMember] = useState<any | null>(null);
  const [qrStep, setQrStep] = useState<"show_qr" | "authenticating" | "success">("show_qr");
  const [qrTimeout, setQrTimeout] = useState<NodeJS.Timeout | null>(null);
  const [connectType, setConnectType] = useState<"qr" | "pairing">("qr");

  // Chat Monitoring
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [whatsappChats, setWhatsappChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);
  const prevLastMessageTime = useRef("");

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await getUsersAction();
      if (res.success && res.users) {
        setMembers(res.users);
      } else {
        setError(res.error || "Failed to load members.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (user?.role === "SUPERADMIN") {
      loadMembers();
    }
  }, [user]);

  // Load chats for selected member
  useEffect(() => {
    if (!selectedMember || !selectedMember.whatsappConnected) {
      setWhatsappChats([]);
      setSelectedChatId(null);
      return;
    }

    async function loadChats() {
      const res = await getMemberWhatsappChatsAction(selectedMember.id);
      if (res.success && res.chats) {
        setWhatsappChats(res.chats);
        setSelectedChatId(prev => prev ? prev : (res.chats.length > 0 ? res.chats[0].id : null));
      }
    }

    loadChats();
    const interval = setInterval(loadChats, 5000); // Poll chats
    return () => clearInterval(interval);
  }, [selectedMember]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChatId) {
      setChatMessages([]);
      return;
    }
    const activeChat = whatsappChats.find((c) => c.id === selectedChatId);
    if (activeChat) {
      try {
        setChatMessages(JSON.parse(activeChat.messages));
      } catch (e) {
        setChatMessages([]);
      }
    }
  }, [selectedChatId, whatsappChats]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    const hasNewMessage = chatMessages.length !== prevMessagesLength.current || 
                         lastMsg.time !== prevLastMessageTime.current;
    
    if (hasNewMessage) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessagesLength.current = chatMessages.length;
      prevLastMessageTime.current = lastMsg.time;
    }
  }, [chatMessages]);

  const handleOpenConnect = async (member: any) => {
    setConnectingMember(member);
    setQrStep("show_qr");
    setIsConnectModalOpen(true);
    
    // Trigger connection in background service
    const res = await connectMemberWhatsappAction(member.id);
    if (!res.success) {
      alert("Failed to start WhatsApp service: " + res.error);
      setIsConnectModalOpen(false);
    }
  };

  // Poll connection status and QR code while modal is open
  useEffect(() => {
    if (!isConnectModalOpen || !connectingMember) return;

    let pollInterval = setInterval(async () => {
      const res = await getUsersAction();
      if (res.success && res.users) {
        setMembers(res.users);
        const updatedMember = res.users.find((u: any) => u.id === connectingMember.id);
        if (updatedMember) {
          setConnectingMember(updatedMember);
          if (updatedMember.whatsappConnected) {
            setQrStep("success");
            clearInterval(pollInterval);
          }
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isConnectModalOpen, connectingMember]);

  // Removed handleSimulateScan since scanning is now live via real QR code.

  const handleDisconnect = async (member: any) => {
    if (!confirm(`Disconnect WhatsApp Business for ${member.name}?`)) return;
    const res = await disconnectMemberWhatsappAction(member.id);
    if (res.success) {
      loadMembers();
      if (selectedMember && selectedMember.id === member.id) {
        setSelectedMember({ ...selectedMember, whatsappConnected: false });
      }
    } else {
      alert("Failed to disconnect: " + res.error);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChatId) return;

    const textToSend = replyText;
    setReplyText("");
    setSendingReply(true);

    const res = await sendWhatsappMessageAction(selectedChatId, textToSend);
    if (res.success) {
      // Refresh local chats instantly
      const activeChat = whatsappChats.find((c) => c.id === selectedChatId);
      if (activeChat) {
        const currentMsgs = JSON.parse(activeChat.messages);
        const updatedMsgs = [...currentMsgs, { sender: "agent", text: textToSend, time: new Date().toISOString() }];
        setChatMessages(updatedMsgs);
      }
    } else {
      alert("Failed to send message: " + res.error);
    }
    setSendingReply(false);
  };

  if (!user || user.role !== "SUPERADMIN") {
    return (
      <SidebarLayout>
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-6 text-center text-rose-400">
          Access Denied. This view is restricted to SuperAdmin personnel only.
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Members Portal & WhatsApp Integrations
          </h2>
          <p className="text-sm text-slate-400">
            Monitor active team members, manage WhatsApp Business QR authentication, and view live chat logs.
          </p>
        </div>

        {/* Member Grid and Directory */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Members List Panel */}
          <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md space-y-4 flex flex-col h-[600px] overflow-hidden">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Smartphone className="text-blue-400" size={18} />
              Team Directory
            </h3>

            {loadingMembers ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      if (member.whatsappConnected) {
                        setSelectedMember(member);
                      } else {
                        setSelectedMember(null);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedMember?.id === member.id
                        ? "bg-blue-600/10 border-blue-500"
                        : "bg-slate-950/40 border-slate-800 hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                          alt={member.name}
                          className="h-9 w-9 rounded-full border border-slate-800 object-cover"
                        />
                        <div>
                          <h4 className="font-semibold text-slate-200 text-sm">{member.name}</h4>
                          <p className="text-xs text-slate-400">{member.role}</p>
                        </div>
                      </div>

                      {/* Connection Status Badge */}
                      {member.whatsappConnected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Connected
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 border border-slate-800 px-2 py-0.5 rounded-full">
                          Offline
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-850 pt-2.5">
                      <span className="text-slate-400 font-mono">{member.whatsapp || "No WhatsApp"}</span>
                      
                      <div className="flex gap-2">
                        {member.whatsappConnected ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDisconnect(member);
                              }}
                              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!member.whatsapp) {
                                alert("Please configure a WhatsApp number in System Settings first.");
                                return;
                              }
                              handleOpenConnect(member);
                            }}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Connect QR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live WhatsApp Chats Monitor Panel */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md flex flex-col h-[600px] overflow-hidden">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <MessageSquare className="text-emerald-400" size={18} />
              WhatsApp Business Live Monitor
              {selectedMember && (
                <span className="text-xs font-normal text-slate-400">
                  (Monitoring: {selectedMember.name})
                </span>
              )}
            </h3>

            {!selectedMember ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6">
                <AlertCircle className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-sm">Select a connected team member from the directory to monitor their live WhatsApp Business chats.</p>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Chats List (Left) */}
                <div className="w-1/3 border-r border-slate-800 flex flex-col">
                  {loadingChats && whatsappChats.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                    </div>
                  ) : whatsappChats.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500 p-4 text-center">
                      No active WhatsApp chats found for this member.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-850 pr-2 mt-2">
                      {whatsappChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChatId(chat.id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors mb-1.5 ${
                            selectedChatId === chat.id
                              ? "bg-slate-800/80"
                              : "hover:bg-slate-850/50"
                          }`}
                        >
                          <div className="font-semibold text-slate-200 text-sm truncate">{chat.contactName}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{chat.lastMessage}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Messages Window (Right) */}
                <div className="w-2/3 flex flex-col bg-slate-950/20 pl-4">
                  {selectedChatId ? (
                    <>
                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-2 space-y-3.5 pr-1">
                        {chatMessages.map((msg, i) => {
                          const isAgent = msg.sender === "agent";
                          return (
                            <div
                              key={i}
                              className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-xl px-3.5 py-1.8 text-xs ${
                                  isAgent
                                    ? "bg-emerald-600 text-white rounded-br-none"
                                    : "bg-slate-800 text-slate-200 rounded-bl-none"
                                }`}
                              >
                                <p>{msg.text}</p>
                                <div className="text-[9px] opacity-60 text-right mt-1">
                                  {new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Reply Form */}
                      <form onSubmit={handleSendReply} className="border-t border-slate-800 pt-3 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Reply as Agent..."
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim() || sendingReply}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                      Select a chat thread to view conversation
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Authentication Modal */}
        {isConnectModalOpen && connectingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-center space-y-5">
              
              {/* Modal Close */}
              <button
                onClick={() => {
                  if (qrTimeout) clearTimeout(qrTimeout);
                  setIsConnectModalOpen(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold text-slate-200">
                Connect WhatsApp Business
              </h3>
              <p className="text-xs text-slate-400">
                Link device for <strong>{connectingMember.name}</strong> ({connectingMember.whatsapp})
              </p>

              {/* Connection Type Toggle */}
              {qrStep === "show_qr" && (
                <div className="flex rounded-lg bg-slate-950/40 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setConnectType("qr")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      connectType === "qr"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectType("pairing")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      connectType === "pairing"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Pairing Code
                  </button>
                </div>
              )}

              {/* QR Scan Steps */}
              {connectType === "qr" && qrStep === "show_qr" && (
                <div className="space-y-4">
                  <div className="mx-auto w-48 h-48 bg-white p-3 rounded-lg flex items-center justify-center shadow-lg relative">
                    {connectingMember.whatsappQr ? (
                      <img
                        src={connectingMember.whatsappQr}
                        alt="WhatsApp QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 text-center text-[11px] gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        Generating QR Code...
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Open WhatsApp on your mobile phone, tap Menu or Settings, select Linked Devices, and point your camera at this screen.
                  </p>
                </div>
              )}

              {/* Pairing Code Steps */}
              {connectType === "pairing" && qrStep === "show_qr" && (
                <div className="space-y-4">
                  <div className="mx-auto bg-slate-950/60 p-5 rounded-xl border border-slate-850 flex items-center justify-center min-h-[100px]">
                    {connectingMember.whatsappPairingCode ? (
                      <div className="text-2xl font-bold tracking-[0.2em] text-blue-400 font-mono">
                        {connectingMember.whatsappPairingCode.slice(0, 4)} - {connectingMember.whatsappPairingCode.slice(4)}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 text-center text-[11px] gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        Generating Pairing Code...
                      </div>
                    )}
                  </div>
                  
                  <div className="text-left text-[11px] text-slate-400 space-y-2 bg-slate-950/30 p-3.5 rounded-lg border border-slate-850">
                    <p className="font-semibold text-slate-300">How to link using phone number:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open WhatsApp on your phone.</li>
                      <li>Tap <span className="text-slate-300 font-medium">Menu</span> or <span className="text-slate-300 font-medium">Settings</span> &gt; <span className="text-slate-300 font-medium">Linked Devices</span>.</li>
                      <li>Tap <span className="text-slate-300 font-medium">Link a Device</span> &gt; <span className="text-slate-300 font-medium">Link with phone number instead</span>.</li>
                      <li>Enter the 8-character code shown above.</li>
                    </ol>
                  </div>
                </div>
              )}

              {qrStep === "authenticating" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                  <p className="text-xs text-slate-355">Authenticating device session...</p>
                </div>
              )}

              {qrStep === "success" && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
                  <div>
                    <p className="text-sm font-bold text-slate-200">WhatsApp Connected!</p>
                    <p className="text-xs text-slate-400 mt-1">Device linked and receiving chats in real-time.</p>
                  </div>
                  <button
                    onClick={() => setIsConnectModalOpen(false)}
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 px-6 py-2 text-xs font-bold text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
