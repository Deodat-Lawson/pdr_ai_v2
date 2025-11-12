import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { agentAiChatbotMemory } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

// POST /api/agent-ai-chatbot/memory - Store memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      chatId, 
      memoryType, 
      key, 
      value, 
      importance = 5, 
      embedding,
      expiresAt 
    } = body;

    if (!chatId || !memoryType || !key || !value) {
      return NextResponse.json(
        { error: "chatId, memoryType, key, and value are required" },
        { status: 400 }
      );
    }

    const memoryId = randomUUID();

    const [newMemory] = await db
      .insert(agentAiChatbotMemory)
      .values({
        id: memoryId,
        chatId,
        memoryType,
        key,
        value,
        importance,
        embedding,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      memory: newMemory,
    });
  } catch (error) {
    console.error("Error storing memory:", error);
    return NextResponse.json(
      { error: "Failed to store memory" },
      { status: 500 }
    );
  }
}

// GET /api/agent-ai-chatbot/memory?chatId=xxx - Get memories for a chat
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const memoryType = searchParams.get("memoryType");

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required" },
        { status: 400 }
      );
    }

    let query = db
      .select()
      .from(agentAiChatbotMemory)
      .where(eq(agentAiChatbotMemory.chatId, chatId));

    if (memoryType) {
      query = query.where(
        and(
          eq(agentAiChatbotMemory.chatId, chatId),
          eq(agentAiChatbotMemory.memoryType, memoryType)
        )
      );
    }

    const memories = await query.orderBy(
      desc(agentAiChatbotMemory.importance),
      desc(agentAiChatbotMemory.accessedAt)
    );

    // Update accessedAt for retrieved memories
    const memoryIds = memories.map((m) => m.id);
    if (memoryIds.length > 0) {
      await db
        .update(agentAiChatbotMemory)
        .set({ accessedAt: new Date() })
        .where(eq(agentAiChatbotMemory.chatId, chatId));
    }

    return NextResponse.json({
      success: true,
      memories,
    });
  } catch (error) {
    console.error("Error fetching memories:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}

