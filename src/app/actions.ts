"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  getMetaConfig,
  getMetaWhatsappTemplates,
  sendMetaCapiEvent,
  sendMetaWhatsappMessage,
  sendMetaWhatsappTemplate,
} from "@/lib/meta";

async function resolveUserId(id: string | undefined): Promise<string | undefined> {
  if (!id) return undefined;
  if (id === "superadmin-id") {
    const admin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });
    return admin?.id || id;
  }
  return id;
}

export async function loginAction(email: string, password?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) {
      return { success: false, error: "User not found with this email." };
    }
    console.log("[Login Debug]", {
      email,
      enteredPassword: password,
      dbPassword: user.password,
      match: user.password === password
    });
    if (password && user.password !== password) {
      return { success: false, error: "Incorrect password." };
    }
    return { success: true, user };
  } catch (error: any) {
    console.error("Login Action Error:", error);
    return { success: false, error: "An unexpected error occurred during login." };
  }
}

export async function getUsersAction() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, users };
  } catch (error) {
    console.error("Get Users Action Error:", error);
    return { success: false, error: "Failed to fetch users." };
  }
}

export async function getDashboardStatsAction(role: string, userId: string) {
  try {
    // 1. Leads counts
    let totalLeads = 0;
    
    if (role === "AGENT") {
      totalLeads = await prisma.lead.count({
        where: { assignedAgentId: userId },
      });
    } else {
      totalLeads = await prisma.lead.count();
    }

    // Calculate leads change percentage dynamically
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    let currentPeriodLeads = 0;
    let previousPeriodLeads = 0;

    if (role === "AGENT") {
      currentPeriodLeads = await prisma.lead.count({
        where: {
          assignedAgentId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      previousPeriodLeads = await prisma.lead.count({
        where: {
          assignedAgentId: userId,
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
      });
    } else {
      currentPeriodLeads = await prisma.lead.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });
      previousPeriodLeads = await prisma.lead.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
      });
    }

    let leadsChange = "0% from last month";
    if (previousPeriodLeads > 0) {
      const pct = ((currentPeriodLeads - previousPeriodLeads) / previousPeriodLeads) * 100;
      leadsChange = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% from last month`;
    } else if (currentPeriodLeads > 0) {
      leadsChange = `+100% from last month`;
    }

    // 2. Active Inventory
    const activeInventory = await prisma.property.count({
      where: {
        status: { in: ["AVAILABLE", "RESERVED"] },
      },
    });

    // 3. Sales Volume (sum of won leads property value or total sold property prices)
    // Let's compute actual sales volume from SOLD properties in the DB
    const soldProperties = await prisma.property.findMany({
      where: { status: "SOLD" },
      select: { price: true },
    });
    const salesVolume = soldProperties.reduce((sum: number, p: { price: number }) => sum + p.price, 0);

    // 4. Leaderboard Ranking
    // Let's get agents and count how many WON leads they have
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
    });

    const leaderboard = await Promise.all(
      agents.map(async (agent) => {
        // Find won leads and sum their maxBudget
        const wonLeads = await prisma.lead.findMany({
          where: {
            assignedAgentId: agent.id,
            status: "WON",
          },
          select: {
            maxBudget: true,
          },
        });

        const wonCount = wonLeads.length;
        const volume = wonLeads.reduce((sum, lead) => sum + (lead.maxBudget || 975000), 0);
        
        // Return structured leaderboard row
        let achievements: string[] = [];
        if (wonCount > 0) achievements.push("Deal Closer");
        if (volume > 1000000) achievements.push("Million Dollar Club");
        
        return {
          id: agent.id,
          name: agent.name,
          avatarUrl: agent.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          dealsClosed: wonCount,
          volume,
          achievements,
        };
      })
    );

    // Sort leaderboard by deals closed, then volume
    leaderboard.sort((a, b) => b.dealsClosed - a.dealsClosed || b.volume - a.volume);

    // 5. System Logs (Only visible to SuperAdmin)
    let systemLogs: { timestamp: string; level: string; message: string }[] = [];
    if (role === "SUPERADMIN") {
      // Fetch recent leads
      const recentLeadsForLogs = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      // Fetch recent properties
      const recentPropertiesForLogs = await prisma.property.findMany({
        orderBy: { createdAt: "desc" },
        take: 2,
      });

      systemLogs = [
        ...recentLeadsForLogs.map(lead => ({
          timestamp: lead.createdAt.toISOString(),
          level: "INFO",
          message: `New lead "${lead.name}" received via ${lead.source}.`,
        })),
        ...recentPropertiesForLogs.map(prop => ({
          timestamp: prop.createdAt.toISOString(),
          level: "INFO",
          message: `Property "${prop.project}" (${prop.type}) added to inventory.`,
        })),
      ];

      // If no logs, add a default one
      if (systemLogs.length === 0) {
        systemLogs.push({
          timestamp: new Date().toISOString(),
          level: "INFO",
          message: "System initialized. Database check passed.",
        });
      }

      // Sort logs by timestamp desc
      systemLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // 6. Fetch Agent's Pending Tasks
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: "PENDING",
      },
      include: {
        lead: {
          select: { name: true },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // 7. Fetch Recent Activities (Recent Notes)
    const recentActivities = await prisma.note.findMany({
      include: {
        lead: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      success: true,
      stats: {
        totalLeads,
        activeInventory,
        salesVolume,
        leadsChange,
      },
      leaderboard,
      systemLogs,
      pendingTasks,
      recentActivities,
    };
  } catch (error: any) {
    console.error("Get Dashboard Stats Error:", error);
    return { success: false, error: "Failed to load dashboard metrics." };
  }
}

export async function getLeadsAction(
  role: string,
  userId: string,
  filters: { status?: string; source?: string } = {}
) {
  try {
    const resolvedUserId = await resolveUserId(userId) || userId;
    const whereClause: any = {};

    // Fetch user permissions from database
    const user = await prisma.user.findUnique({ where: { id: resolvedUserId } });
    const isSuperAdmin = user?.role === "SUPERADMIN";
    const isManager = user?.role === "MANAGER";
    let canViewTeamChats = false;
    if (user?.permissions) {
      try {
        const perms = JSON.parse(user.permissions);
        canViewTeamChats = !!perms.canViewTeamChats;
      } catch (e) {}
    }

    // Role restriction: Agent or Manager without team chat access can only view their own leads
    if (!isSuperAdmin) {
      if (isManager && canViewTeamChats) {
        // Manager can view other members' leads, but NOT SuperAdmin's leads
        const superAdmins = await prisma.user.findMany({
          where: { role: "SUPERADMIN" },
          select: { id: true },
        });
        const superAdminIds = superAdmins.map((u) => u.id);
        
        whereClause.NOT = {
          assignedAgentId: { in: superAdminIds }
        };
      } else {
        // Agent or Manager without permission can only view their own leads
        whereClause.assignedAgentId = resolvedUserId;
      }
    }

    // Apply filtering options
    if (filters.status && filters.status !== "ALL") {
      whereClause.status = filters.status;
    }
    if (filters.source && filters.source !== "ALL") {
      whereClause.source = filters.source;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, leads };
  } catch (error) {
    console.error("Get Leads Error:", error);
    return { success: false, error: "Failed to fetch leads." };
  }
}

export async function getPropertiesAction(searchQuery?: string) {
  try {
    const whereClause: any = {};

    if (searchQuery && searchQuery.trim() !== "") {
      const search = searchQuery.trim();
      whereClause.OR = [
        { project: { contains: search } },
        { type: { contains: search } },
      ];
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, properties };
  } catch (error) {
    console.error("Get Properties Error:", error);
    return { success: false, error: "Failed to fetch property inventory." };
  }
}

export async function upsertLeadAction(leadData: {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  status: string;
  assignedAgentId?: string | null;
  clickId?: string | null;
  preferredType?: string | null;
  maxBudget?: number | null;
}) {
  try {
    const { id, name, email, phone, source, status, assignedAgentId, clickId, preferredType, maxBudget } = leadData;

    let assignedAgentName: string | null = null;
    if (assignedAgentId) {
      const agent = await prisma.user.findUnique({
        where: { id: assignedAgentId },
      });
      if (agent) {
        assignedAgentName = agent.name;
      }
    }

    const payload = {
      name,
      email,
      phone,
      source,
      status,
      assignedAgentId,
      assignedAgentName,
      clickId: clickId || `manual_${Date.now()}`,
      preferredType: preferredType || null,
      maxBudget: maxBudget || null,
    };

    if (id) {
      const updated = await prisma.lead.update({
        where: { id },
        data: payload,
      });
      return { success: true, lead: updated };
    } else {
      const created = await prisma.lead.create({
        data: payload,
      });
      // Trigger Meta CAPI Lead Event
      try {
        await sendMetaCapiEvent("Lead", {
          email: created.email,
          phone: created.phone,
          clickId: created.clickId,
        });
      } catch (err) {
        console.error("CAPI Lead Event Error:", err);
      }
      return { success: true, lead: created };
    }
  } catch (error: any) {
    console.error("Upsert Lead Error:", error);
    return { success: false, error: "Failed to save lead: " + error.message };
  }
}

export async function deleteLeadAction(leadId: string) {
  try {
    await prisma.lead.delete({
      where: { id: leadId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Delete Lead Error:", error);
    return { success: false, error: "Failed to delete lead: " + error.message };
  }
}

export async function upsertPropertyAction(propertyData: {
  id?: string;
  project: string;
  type: string;
  transaction: string;
  price: number;
  status: string;
  installments: string;
  beds?: number | null;
  baths?: number | null;
  area?: number | null;
}) {
  try {
    const { id, project, type, transaction, price, status, installments, beds, baths, area } = propertyData;

    const payload = {
      project,
      type,
      transaction,
      price: Number(price),
      status,
      installments,
      beds: beds ? Number(beds) : null,
      baths: baths ? Number(baths) : null,
      area: area ? Number(area) : null,
    };

    if (id) {
      const updated = await prisma.property.update({
        where: { id },
        data: payload,
      });
      return { success: true, property: updated };
    } else {
      const created = await prisma.property.create({
        data: payload,
      });
      return { success: true, property: created };
    }
  } catch (error: any) {
    console.error("Upsert Property Error:", error);
    return { success: false, error: "Failed to save property: " + error.message };
  }
}

export async function deletePropertyAction(propertyId: string) {
  try {
    await prisma.property.delete({
      where: { id: propertyId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Delete Property Error:", error);
    return { success: false, error: "Failed to delete property: " + error.message };
  }
}

export async function upsertUserAction(
  userData: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role: string;
    avatarUrl?: string | null;
    whatsapp?: string | null;
    permissions?: string;
  },
  operatorId?: string
) {
  try {
    const resolvedOperatorId = await resolveUserId(operatorId);
    // If an operatorId is provided, verify they have permission to manage the team
    if (resolvedOperatorId) {
      const operator = await prisma.user.findUnique({ where: { id: resolvedOperatorId } });
      if (!operator) {
        return { success: false, error: "Your session is invalid. Please log out and log in again." };
      }
      const isSuperAdmin = operator?.role === "SUPERADMIN";
      const isManager = operator?.role === "MANAGER";
      let canManageTeam = false;
      if (operator?.permissions) {
        try {
          const perms = JSON.parse(operator.permissions);
          canManageTeam = !!perms.canManageTeam;
        } catch (e) {}
      }
      if (!isSuperAdmin && !(isManager && canManageTeam)) {
        return { success: false, error: "Unauthorized: You do not have permission to manage team members." };
      }
    }

    const resolvedTargetId = await resolveUserId(userData.id);
    const { id, name, email, password, role, avatarUrl, whatsapp, permissions } = userData;

    const payload: any = {
      name,
      email: email.toLowerCase().trim(),
      role,
      avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      whatsapp: whatsapp || null,
    };

    if (password) {
      payload.password = password;
    }
    if (permissions) {
      payload.permissions = permissions;
    }

    if (resolvedTargetId) {
      // 1. Update the user
      const updated = await prisma.user.update({
        where: { id: resolvedTargetId },
        data: payload,
      });

      // 2. Cascade update to Lead table to keep assignedAgentName synchronized
      await prisma.lead.updateMany({
        where: { assignedAgentId: resolvedTargetId },
        data: { assignedAgentName: name },
      });

      revalidatePath("/settings");
      revalidatePath("/chats");

      return { success: true, user: updated };
    } else {
      const created = await prisma.user.create({
        data: payload,
      });

      revalidatePath("/settings");
      revalidatePath("/chats");

      return { success: true, user: created };
    }
  } catch (error: any) {
    console.error("Upsert User Error:", error);
    return { success: false, error: "Failed to save user: " + error.message };
  }
}

export async function deleteUserAction(userId: string, operatorId?: string) {
  try {
    const resolvedUserId = await resolveUserId(userId) || userId;
    const resolvedOperatorId = await resolveUserId(operatorId);

    // If an operatorId is provided, verify they have permission to manage the team
    if (resolvedOperatorId) {
      const operator = await prisma.user.findUnique({ where: { id: resolvedOperatorId } });
      if (!operator) {
        return { success: false, error: "Your session is invalid. Please log out and log in again." };
      }
      const isSuperAdmin = operator?.role === "SUPERADMIN";
      const isManager = operator?.role === "MANAGER";
      let canManageTeam = false;
      if (operator?.permissions) {
        try {
          const perms = JSON.parse(operator.permissions);
          canManageTeam = !!perms.canManageTeam;
        } catch (e) {}
      }
      if (!isSuperAdmin && !(isManager && canManageTeam)) {
        return { success: false, error: "Unauthorized: You do not have permission to delete team members." };
      }
    }

    // 1. Disconnect WhatsApp session in the background without blocking
    disconnectMemberWhatsappAction(resolvedUserId).catch((e) => {
      console.warn("Failed to disconnect WhatsApp session during user deletion:", e);
    });

    // 2. Run all database updates/deletions in a transaction to be extremely robust
    await prisma.$transaction([
      // Set lead assignments to null
      prisma.lead.updateMany({
        where: { assignedAgentId: resolvedUserId },
        data: { assignedAgentId: null, assignedAgentName: null },
      }),
      // Set senderId to null in Message table for messages sent by this user
      prisma.message.updateMany({
        where: { senderId: resolvedUserId },
        data: { senderId: null },
      }),
      // Delete all WhatsApp chats belonging to this user
      prisma.whatsappChat.deleteMany({
        where: { userId: resolvedUserId },
      }),
      // Delete the user
      prisma.user.delete({
        where: { id: resolvedUserId },
      }),
    ]);

    revalidatePath("/settings");
    revalidatePath("/chats");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return { success: false, error: "Failed to delete user: " + error.message };
  }
}


export async function updateLeadStatusAction(leadId: string, status: string) {
  try {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { status }
    });

    // Trigger Meta CAPI Events based on status
    try {
      if (status === "WON") {
        await sendMetaCapiEvent("Purchase", {
          email: lead.email,
          phone: lead.phone,
          clickId: lead.clickId,
          value: lead.maxBudget || 1000, // Fallback conversion value
          currency: "USD",
        });
      } else if (status === "CONTACTED") {
        await sendMetaCapiEvent("Contact", {
          email: lead.email,
          phone: lead.phone,
          clickId: lead.clickId,
        });
      }
    } catch (err) {
      console.error("CAPI Status Event Error:", err);
    }

    return { success: true, lead };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLeadMessagesAction(leadId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { name: true, avatarUrl: true }
        }
      }
    });
    return { success: true, messages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendMessageAction(leadId: string, content: string, senderId: string | null, isFromLead: boolean) {
  try {
    const msg = await prisma.message.create({
      data: {
        leadId,
        content,
        senderId,
        isFromLead,
      },
    });
    return { success: true, message: msg };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateAiSuggestionAction(leadId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
      take: 5
    });
    
    let suggestion = "Hello! How can I assist you today?";
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isFromLead) {
        if (lastMessage.content.toLowerCase().includes("price")) {
          suggestion = "The pricing depends on the specific property type and location. Would you like me to send you our latest brochure with exact figures?";
        } else if (lastMessage.content.toLowerCase().includes("location")) {
          suggestion = "We have properties in multiple prime locations. Are you looking for something in the city center or the suburbs?";
        } else {
          suggestion = "Thanks for your message! Could you provide a bit more detail so I can help you better?";
        }
      } else {
         suggestion = "Following up to see if you had any questions about the properties I sent over.";
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return { success: true, suggestion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignLeadAction(leadId: string, agentId: string | null, agentName: string | null) {
  try {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedAgentId: agentId,
        assignedAgentName: agentName,
      },
    });
    return { success: true, lead };
  } catch (error: any) {
    console.error("Assign Lead Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getIncomingLeadsAction() {
  try {
    const leads = await prisma.lead.findMany({
      where: { assignedAgentId: null },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, leads };
  } catch (error: any) {
    console.error("Get Incoming Leads Error:", error);
    return { success: false, error: error.message };
  }
}

export async function createIncomingLeadAction(data: {
  name: string;
  phone?: string;
  email?: string;
  source: string;
  clickId?: string;
}) {
  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        source: data.source,
        clickId: data.clickId || null,
        status: "QUEUED",
        assignedAgentId: null,
        assignedAgentName: null,
      },
    });
    return { success: true, lead };
  } catch (error: any) {
    console.error("Create Incoming Lead Error:", error);
    return { success: false, error: error.message };
  }
}

export async function addLeadNoteAction(leadId: string, userId: string, userName: string, content: string) {
  try {
    const note = await prisma.note.create({
      data: {
        leadId,
        userId,
        userName,
        content,
      },
    });
    return { success: true, note };
  } catch (error: any) {
    console.error("Add Lead Note Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getLeadNotesAction(leadId: string) {
  try {
    const notes = await prisma.note.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, notes };
  } catch (error: any) {
    console.error("Get Lead Notes Error:", error);
    return { success: false, error: error.message };
  }
}

export async function createLeadTaskAction(leadId: string, userId: string, title: string, dueDate: Date) {
  try {
    const task = await prisma.task.create({
      data: {
        leadId,
        userId,
        title,
        dueDate,
        status: "PENDING",
      },
    });
    return { success: true, task };
  } catch (error: any) {
    console.error("Create Lead Task Error:", error);
    return { success: false, error: error.message };
  }
}

export async function completeLeadTaskAction(taskId: string) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: "COMPLETED" },
    });
    return { success: true, task };
  } catch (error: any) {
    console.error("Complete Lead Task Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getLeadTasksAction(leadId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { leadId },
      orderBy: { dueDate: "asc" },
    });
    return { success: true, tasks };
  } catch (error: any) {
    console.error("Get Lead Tasks Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMatchedPropertiesAction(preferredType: string, maxBudget: number) {
  try {
    const properties = await prisma.property.findMany({
      where: {
        type: preferredType,
        price: {
          lte: maxBudget,
        },
        status: "AVAILABLE",
      },
      orderBy: { price: "desc" },
    });
    return { success: true, properties };
  } catch (error: any) {
    console.error("Get Matched Properties Error:", error);
    return { success: false, error: error.message };
  }
}

export async function connectMemberWhatsappAction(userId: string) {
  try {
    const response = await fetch("http://localhost:3001/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();
    if (!data.success) {
      return { success: false, error: data.error };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Connect WhatsApp Action Error:", error);
    return { success: false, error: "Is the WhatsApp background service running? " + error.message };
  }
}

export async function disconnectMemberWhatsappAction(userId: string) {
  try {
    const response = await fetch("http://localhost:3001/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();
    if (!data.success) {
      return { success: false, error: data.error };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Disconnect WhatsApp Action Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMemberWhatsappChatsAction(userId: string, role?: string) {
  try {
    const resolvedUserId = await resolveUserId(userId) || userId;
    // Fetch user permissions from database
    const user = await prisma.user.findUnique({ where: { id: resolvedUserId } });
    const isSuperAdmin = user?.role === "SUPERADMIN";
    const isManager = user?.role === "MANAGER";
    let canViewTeamChats = false;
    if (user?.permissions) {
      try {
        const perms = JSON.parse(user.permissions);
        canViewTeamChats = !!perms.canViewTeamChats;
      } catch (e) {}
    }

    const whereClause: any = {};
    if (!isSuperAdmin) {
      if (isManager && canViewTeamChats) {
        // Manager can view other members' chats, but NOT SuperAdmin's chats
        const superAdmins = await prisma.user.findMany({
          where: { role: "SUPERADMIN" },
          select: { id: true },
        });
        const superAdminIds = superAdmins.map((u) => u.id);
        
        whereClause.NOT = {
          userId: { in: superAdminIds }
        };
      } else {
        // Agent or Manager without permission can only view their own chats
        whereClause.userId = resolvedUserId;
      }
    }

    const chats = await prisma.whatsappChat.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    return { success: true, chats };
  } catch (error: any) {
    console.error("Get WhatsApp Chats Error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsappMessageAction(chatId: string, content: string) {
  try {
    const response = await fetch("http://localhost:3001/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message: content }),
    });
    const data = await response.json();
    if (!data.success) {
      return { success: false, error: data.error };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Send WhatsApp Message Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMetaSettingsAction() {
  try {
    const config = await getMetaConfig();
    return { success: true, config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveMetaSettingsAction(settings: {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  pixelId: string;
}) {
  try {
    const data = [
      { key: "META_ACCESS_TOKEN", value: settings.accessToken },
      { key: "META_PHONE_NUMBER_ID", value: settings.phoneNumberId },
      { key: "META_WABA_ID", value: settings.wabaId },
      { key: "META_VERIFY_TOKEN", value: settings.verifyToken },
      { key: "META_PIXEL_ID", value: settings.pixelId },
    ];

    for (const item of data) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMetaTemplatesAction() {
  try {
    const templates = await getMetaWhatsappTemplates();
    return { success: true, templates };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendMetaWhatsappMessageAction(chatId: string, content: string) {
  try {
    const chat = await prisma.whatsappChat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return { success: false, error: "Chat not found" };
    }

    await sendMetaWhatsappMessage(chat.contactPhone, content);

    // Update local database
    const currentMessages = JSON.parse(chat.messages || "[]");
    const updatedMessages = [
      ...currentMessages,
      { sender: "agent", text: content, time: new Date().toISOString() },
    ];

    await prisma.whatsappChat.update({
      where: { id: chatId },
      data: {
        lastMessage: content,
        messages: JSON.stringify(updatedMessages),
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendMetaWhatsappTemplateAction(chatId: string, templateName: string, languageCode: string) {
  try {
    const chat = await prisma.whatsappChat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return { success: false, error: "Chat not found" };
    }

    await sendMetaWhatsappTemplate(chat.contactPhone, templateName, languageCode);

    // Update local database
    const content = `[Sent Template: ${templateName}]`;
    const currentMessages = JSON.parse(chat.messages || "[]");
    const updatedMessages = [
      ...currentMessages,
      { sender: "agent", text: content, time: new Date().toISOString() },
    ];

    await prisma.whatsappChat.update({
      where: { id: chatId },
      data: {
        lastMessage: content,
        messages: JSON.stringify(updatedMessages),
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createLeadFromWhatsappChatAction(
  chatId: string,
  leadData: {
    name: string;
    email?: string | null;
    status: string;
    source: string;
    assignedAgentId?: string | null;
  }
) {
  try {
    const chat = await prisma.whatsappChat.findUnique({
      where: { id: chatId },
    });
    if (!chat) {
      return { success: false, error: "WhatsApp chat not found." };
    }

    let assignedAgentName: string | null = null;
    if (leadData.assignedAgentId) {
      const agent = await prisma.user.findUnique({
        where: { id: leadData.assignedAgentId },
      });
      if (agent) {
        assignedAgentName = agent.name;
      }
    }

    // Check if lead already exists with this phone
    let lead = await prisma.lead.findFirst({
      where: { phone: chat.contactPhone },
    });

    if (lead) {
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: leadData.name,
          email: leadData.email || lead.email,
          status: leadData.status,
          source: leadData.source,
          assignedAgentId: leadData.assignedAgentId || lead.assignedAgentId,
          assignedAgentName: assignedAgentName || lead.assignedAgentName,
        },
      });
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          name: leadData.name,
          phone: chat.contactPhone,
          email: leadData.email || null,
          status: leadData.status,
          source: leadData.source,
          assignedAgentId: leadData.assignedAgentId || null,
          assignedAgentName: assignedAgentName,
        },
      });
    }

    return { success: true, lead };
  } catch (error: any) {
    console.error("Create Lead from WhatsApp Chat Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleWhatsappLeadAction(
  chatId: string,
  isLead: boolean,
  leadData?: {
    name: string;
    phone?: string;
    email?: string | null;
    status: string;
    source: string;
    assignedAgentId?: string | null;
  }
) {
  try {
    const chat = await prisma.whatsappChat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return { success: false, error: "WhatsApp chat not found." };
    }

    // Find existing lead with this phone
    let lead = await prisma.lead.findFirst({
      where: { phone: chat.contactPhone }
    });

    if (isLead) {
      if (lead) {
        // Update existing
        lead = await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: leadData?.name || chat.contactName,
            phone: leadData?.phone || lead.phone,
            email: leadData?.email || lead.email,
            status: leadData?.status || "QUEUED",
            source: leadData?.source || "WhatsApp Business",
            assignedAgentId: leadData?.assignedAgentId || chat.userId,
          }
        });
      } else {
        // Create new
        let assignedAgentName: string | null = null;
        const agentId = leadData?.assignedAgentId || chat.userId;
        if (agentId) {
          const agent = await prisma.user.findUnique({ where: { id: agentId } });
          if (agent) assignedAgentName = agent.name;
        }

        lead = await prisma.lead.create({
          data: {
            name: leadData?.name || chat.contactName,
            phone: leadData?.phone || chat.contactPhone,
            email: leadData?.email || null,
            status: leadData?.status || "QUEUED",
            source: leadData?.source || "WhatsApp Business",
            assignedAgentId: agentId,
            assignedAgentName,
          }
        });
      }
      return { success: true, isLead: true, lead };
    } else {
      // Unmark as lead -> Delete the lead record from CRM
      if (lead) {
        await prisma.lead.delete({
          where: { id: lead.id }
        });
      }
      return { success: true, isLead: false, lead: null };
    }
  } catch (error: any) {
    console.error("Toggle WhatsApp Lead Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfileAction(
  userId: string,
  data: { name: string; whatsapp?: string | null; avatarUrl?: string | null }
) {
  try {
    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (!exists) {
      return { 
        success: false, 
        error: "Your session is out of sync with the database. Please log out and log back in to refresh your account." 
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        avatarUrl: data.avatarUrl,
      },
    });
    return { success: true, user };
  } catch (error: any) {
    console.error("Update User Profile Error:", error);
    return { success: false, error: error.message || "Failed to update profile." };
  }
}

export async function getSharedAssetsAction() {
  try {
    const assets = await prisma.sharedAsset.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, assets };
  } catch (error: any) {
    console.error("Get Shared Assets Error:", error);
    return { success: false, error: "Failed to fetch shared assets." };
  }
}

export async function createSharedAssetAction(data: {
  name: string;
  category: string;
  url: string;
  mimeType: string;
  fileSize: number;
}) {
  try {
    const asset = await prisma.sharedAsset.create({
      data: {
        name: data.name,
        category: data.category,
        url: data.url,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      },
    });
    return { success: true, asset };
  } catch (error: any) {
    console.error("Create Shared Asset Error:", error);
    return { success: false, error: "Failed to create shared asset." };
  }
}

export async function deleteSharedAssetAction(id: string) {
  try {
    // Optionally delete the file from disk as well
    const asset = await prisma.sharedAsset.findUnique({ where: { id } });
    if (asset) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", asset.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.sharedAsset.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Delete Shared Asset Error:", error);
    return { success: false, error: "Failed to delete shared asset." };
  }
}

export async function signupAction(data: { name: string; email: string; password: string; role?: string }) {
  try {
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
    if (exists) {
      return { success: false, error: "Email already registered." };
    }
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: data.role || "AGENT",
      }
    });
    return { success: true, user };
  } catch (error: any) {
    console.error("Signup Action Error:", error);
    return { success: false, error: error.message };
  }
}

export async function changePasswordAction(userId: string, oldPassword?: string, newPassword?: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: "User not found." };
    }
    if (oldPassword && user.password !== oldPassword) {
      return { success: false, error: "Current password is incorrect." };
    }
    await prisma.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Change Password Error:", error);
    return { success: false, error: error.message };
  }
}




