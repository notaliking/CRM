import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMetaConfig } from "@/lib/meta";

/**
 * GET /api/webhook/whatsapp
 * Webhook Verification endpoint for Meta Cloud API.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const config = await getMetaConfig();

    if (mode && token) {
      if (mode === "subscribe" && token === config.verifyToken) {
        console.log("[Meta Webhook] Verification successful.");
        return new NextResponse(challenge, { status: 200 });
      } else {
        console.warn("[Meta Webhook] Verification failed: Token mismatch.");
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    return new NextResponse("Bad Request", { status: 400 });
  } catch (error) {
    console.error("[Meta Webhook] Verification error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/webhook/whatsapp
 * Handles incoming WhatsApp messages and status updates from Meta.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a WhatsApp status update or a message
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value || !value.messages) {
      // It might be a status update or template status change - acknowledge it
      return NextResponse.json({ success: true, message: "No messages in payload" });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    
    const contactPhone = message.from; // Sender's phone number
    const contactName = contact?.profile?.name || contactPhone;
    
    let text = "[Unsupported Message Type]";
    if (message.type === "text") {
      text = message.text?.body || "";
    } else if (message.type === "button") {
      text = message.button?.text || "[Button Clicked]";
    } else if (message.type === "interactive") {
      const interactiveType = message.interactive?.type;
      if (interactiveType === "button_reply") {
        text = message.interactive?.button_reply?.title || "[Button Reply]";
      } else if (interactiveType === "list_reply") {
        text = message.interactive?.list_reply?.title || "[List Reply]";
      }
    }

    console.log(`[Meta Webhook] Message from ${contactName} (${contactPhone}): ${text}`);

    // We need a userId (agent) to assign the chat to.
    // We will look for an existing chat first.
    let existingChat = await prisma.whatsappChat.findFirst({
      where: { contactPhone },
    });

    let userId = existingChat?.userId;

    if (!userId) {
      // If no existing chat, assign to the first available user (SuperAdmin or Agent)
      const defaultUser = await prisma.user.findFirst({
        where: { role: { in: ["SUPERADMIN", "AGENT"] } },
      });
      if (!defaultUser) {
        console.error("[Meta Webhook] No users found in database to assign incoming chat.");
        return NextResponse.json({ success: false, error: "No agent available" }, { status: 500 });
      }
      userId = defaultUser.id;
    }

    // Parse existing messages or start new list
    let currentMessages = [];
    if (existingChat) {
      try {
        currentMessages = JSON.parse(existingChat.messages);
      } catch (e) {
        currentMessages = [];
      }
    }

    const newMessage = {
      sender: "lead",
      text,
      time: new Date().toISOString(),
    };

    const updatedMessages = [...currentMessages, newMessage];

    if (existingChat) {
      await prisma.whatsappChat.update({
        where: { id: existingChat.id },
        data: {
          lastMessage: text,
          messages: JSON.stringify(updatedMessages),
        },
      });
    } else {
      existingChat = await prisma.whatsappChat.create({
        data: {
          userId,
          contactName,
          contactPhone,
          lastMessage: text,
          messages: JSON.stringify(updatedMessages),
        },
      });
    }

    // Auto-creation of lead disabled to allow manual designation and queuing.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Meta Webhook] Error processing message:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
