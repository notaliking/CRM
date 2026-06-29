import { prisma } from "./db";
import crypto from "crypto";

export interface MetaConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  pixelId: string;
}

// Get Meta configuration from DB, fallback to env vars
export async function getMetaConfig(): Promise<MetaConfig> {
  let settings: any[] = [];
  try {
    if (prisma && (prisma as any).systemSetting) {
      settings = await (prisma as any).systemSetting.findMany();
    }
  } catch (error) {
    console.error("Error reading system settings from DB, using env fallbacks:", error);
  }
  
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  return {
    accessToken: settingsMap.get("META_ACCESS_TOKEN") || process.env.META_ACCESS_TOKEN || "",
    phoneNumberId: settingsMap.get("META_PHONE_NUMBER_ID") || process.env.META_PHONE_NUMBER_ID || "",
    wabaId: settingsMap.get("META_WABA_ID") || process.env.META_WABA_ID || "",
    verifyToken: settingsMap.get("META_VERIFY_TOKEN") || process.env.META_VERIFY_TOKEN || "meta_crm_verify_token",
    pixelId: settingsMap.get("META_PIXEL_ID") || process.env.META_PIXEL_ID || "",
  };
}


// SHA256 hashing for Conversions API (CAPI) compliance
function hashData(data: string | undefined | null): string | null {
  if (!data) return null;
  const cleaned = data.trim().toLowerCase();
  return crypto.createHash("sha256").update(cleaned).digest("hex");
}

/**
 * Send WhatsApp Message via Meta Cloud API
 */
export async function sendMetaWhatsappMessage(to: string, text: string) {
  const config = await getMetaConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    throw new Error("Meta WhatsApp configuration is missing (Access Token or Phone Number ID).");
  }

  const cleanPhone = to.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Meta WhatsApp API Error:", data);
    throw new Error(data.error?.message || "Failed to send Meta WhatsApp message.");
  }

  return data;
}

/**
 * Send WhatsApp Template via Meta Cloud API
 */
export async function sendMetaWhatsappTemplate(
  to: string,
  templateName: string,
  languageCode: string = "en_US",
  components: any[] = []
) {
  const config = await getMetaConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    throw new Error("Meta WhatsApp configuration is missing (Access Token or Phone Number ID).");
  }

  const cleanPhone = to.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components.length > 0 ? components : undefined,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Meta WhatsApp Template API Error:", data);
    throw new Error(data.error?.message || "Failed to send Meta WhatsApp template.");
  }

  return data;
}

/**
 * Get Message Templates from WhatsApp Business Account
 */
export async function getMetaWhatsappTemplates() {
  const config = await getMetaConfig();
  if (!config.accessToken || !config.wabaId) {
    return [];
  }

  const url = `https://graph.facebook.com/v20.0/${config.wabaId}/message_templates?limit=100`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta WhatsApp Templates API Error:", data);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch WhatsApp templates:", error);
    return [];
  }
}

/**
 * Send Conversions API (CAPI) Event to Meta
 */
export async function sendMetaCapiEvent(
  eventName: string,
  leadData: {
    email?: string | null;
    phone?: string | null;
    clickId?: string | null;
    value?: number | null;
    currency?: string | null;
  },
  clientIp?: string,
  clientUserAgent?: string
) {
  const config = await getMetaConfig();
  if (!config.accessToken || !config.pixelId) {
    console.warn("Meta CAPI skipped: Pixel ID or Access Token is missing.");
    return null;
  }

  const url = `https://graph.facebook.com/v20.0/${config.pixelId}/events`;

  const hashedEmail = hashData(leadData.email);
  const hashedPhone = hashData(leadData.phone);

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
    action_source: "external", // standard for CRM server-side events
    user_data: {
      em: hashedEmail ? [hashedEmail] : undefined,
      ph: hashedPhone ? [hashedPhone] : undefined,
      fbc: leadData.clickId ? `fb.1.${Math.floor(Date.now() / 1000)}.${leadData.clickId}` : undefined,
      client_ip_address: clientIp || "127.0.0.1",
      client_user_agent: clientUserAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    custom_data: leadData.value ? {
      value: leadData.value,
      currency: leadData.currency || "USD",
    } : undefined,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [eventData],
        access_token: config.accessToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Meta CAPI API Error:", data);
    }
    return data;
  } catch (error) {
    console.error("Failed to send Meta CAPI event:", error);
    return null;
  }
}
