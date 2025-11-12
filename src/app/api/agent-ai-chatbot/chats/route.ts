import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { agentAiChatbotChat } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const runtime = 'nodejs';
export const maxDuration = 300;

// GET /api/agent-ai-chatbot/chats - Get all chats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const chats = await db
      .select()
      .from(agentAiChatbotChat)
      .where(eq(agentAiChatbotChat.userId, userId))
      .orderBy(desc(agentAiChatbotChat.updatedAt));

    return NextResponse.json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

// POST /api/agent-ai-chatbot/chats - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      userId?: string;
      title?: string;
      agentMode?: string;
      visibility?: string;
      aiStyle?: string;
      aiPersona?: string;
    };
    const { 
      userId, 
      title, 
      agentMode = "interactive", 
      visibility = "private",
      aiStyle = "concise",
      aiPersona = "general"
    } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { error: "userId and title are required" },
        { status: 400 }
      );
    }

    const chatId = randomUUID();
    const insertValues = {
      id: chatId,
      userId,
      title,
      agentMode: (agentMode ?? "interactive") as "autonomous" | "interactive" | "assisted",
      visibility: (visibility ?? "private") as "public" | "private",
      status: "active" as const,
      aiStyle: (aiStyle ?? "concise") as "concise" | "detailed" | "academic" | "bullet-points" | undefined,
      aiPersona: (aiPersona ?? "general") as "general" | "learning-coach" | "financial-expert" | "legal-expert" | "math-reasoning" | undefined,
    };

    const [newChat] = await db
      .insert(agentAiChatbotChat)
      .values(insertValues)
      .returning();

    return NextResponse.json({
      success: true,
      chat: newChat,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}

