import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { agentAiChatbotToolCall } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// POST /api/agent-ai-chatbot/tools - Create a tool call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, taskId, toolName, toolInput } = body;

    if (!messageId || !toolName || !toolInput) {
      return NextResponse.json(
        { error: "messageId, toolName, and toolInput are required" },
        { status: 400 }
      );
    }

    const toolCallId = randomUUID();

    const [newToolCall] = await db
      .insert(agentAiChatbotToolCall)
      .values({
        id: toolCallId,
        messageId,
        taskId,
        toolName,
        toolInput,
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      success: true,
      toolCall: newToolCall,
    });
  } catch (error) {
    console.error("Error creating tool call:", error);
    return NextResponse.json(
      { error: "Failed to create tool call" },
      { status: 500 }
    );
  }
}

// GET /api/agent-ai-chatbot/tools?messageId=xxx - Get tool calls for a message
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    const taskId = searchParams.get("taskId");

    if (!messageId && !taskId) {
      return NextResponse.json(
        { error: "messageId or taskId is required" },
        { status: 400 }
      );
    }

    const toolCalls = messageId
      ? await db
          .select()
          .from(agentAiChatbotToolCall)
          .where(eq(agentAiChatbotToolCall.messageId, messageId))
          .orderBy(agentAiChatbotToolCall.createdAt)
      : await db
          .select()
          .from(agentAiChatbotToolCall)
          .where(eq(agentAiChatbotToolCall.taskId, taskId!))
          .orderBy(agentAiChatbotToolCall.createdAt);

    return NextResponse.json({
      success: true,
      toolCalls,
    });
  } catch (error) {
    console.error("Error fetching tool calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch tool calls" },
      { status: 500 }
    );
  }
}

