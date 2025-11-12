import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { agentAiChatbotMessage, agentAiChatbotChat } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// POST /api/agent-ai-chatbot/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, role, content, messageType = "text", parentMessageId } = body;

    if (!chatId || !role || !content) {
      return NextResponse.json(
        { error: "chatId, role, and content are required" },
        { status: 400 }
      );
    }

    const messageId = randomUUID();

    const [newMessage] = await db
      .insert(agentAiChatbotMessage)
      .values({
        id: messageId,
        chatId,
        role,
        content,
        messageType,
        parentMessageId,
      })
      .returning();

    // Update chat's updatedAt timestamp
    await db
      .update(agentAiChatbotChat)
      .set({ updatedAt: new Date() })
      .where(eq(agentAiChatbotChat.id, chatId));

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}

// GET /api/agent-ai-chatbot/messages?chatId=xxx - Get messages for a chat
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required" },
        { status: 400 }
      );
    }

    const messages = await db
      .select()
      .from(agentAiChatbotMessage)
      .where(eq(agentAiChatbotMessage.chatId, chatId))
      .orderBy(agentAiChatbotMessage.createdAt);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

