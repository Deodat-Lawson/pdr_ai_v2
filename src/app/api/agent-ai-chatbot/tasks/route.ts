import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { agentAiChatbotTask } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// POST /api/agent-ai-chatbot/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      chatId?: string;
      description?: string;
      objective?: string;
      priority?: number;
      metadata?: unknown;
    };
    const { chatId, description, objective, priority = 0, metadata } = body;

    if (!chatId || !description || !objective) {
      return NextResponse.json(
        { error: "chatId, description, and objective are required" },
        { status: 400 }
      );
    }

    const taskId = randomUUID();

    const [newTask] = await db
      .insert(agentAiChatbotTask)
      .values({
        id: taskId,
        chatId,
        description,
        objective,
        priority,
        status: "pending",
        metadata,
      })
      .returning();

    return NextResponse.json({
      success: true,
      task: newTask,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

// GET /api/agent-ai-chatbot/tasks?chatId=xxx - Get tasks for a chat
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

    const tasks = await db
      .select()
      .from(agentAiChatbotTask)
      .where(eq(agentAiChatbotTask.chatId, chatId))
      .orderBy(agentAiChatbotTask.priority, agentAiChatbotTask.createdAt);

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

