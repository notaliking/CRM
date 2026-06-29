import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/intake
 * Public endpoint for receiving leads from web forms, Facebook Lead Ads,
 * Google Ads form extensions, or any other source.
 *
 * Body: { name, phone?, email?, source, clickId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, source, clickId } = body;

    if (!name || !source) {
      return NextResponse.json(
        { success: false, error: "name and source are required." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name: String(name),
        phone: phone ? String(phone) : null,
        email: email ? String(email) : null,
        source: String(source),
        clickId: clickId ? String(clickId) : null,
        status: "QUEUED",
        assignedAgentId: null,
        assignedAgentName: null,
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error: any) {
    console.error("Intake API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
