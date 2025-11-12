import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { agentAiChatbotTask, agentAiChatbotExecutionStep } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// GET /api/agent-ai-chatbot/tasks/[taskId] - Get a specific task with execution steps
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    const [task] = await db
      .select()
      .from(agentAiChatbotTask)
      .where(eq(agentAiChatbotTask.id, taskId));

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Get execution steps for this task
    const steps = await db
      .select()
      .from(agentAiChatbotExecutionStep)
      .where(eq(agentAiChatbotExecutionStep.taskId, taskId))
      .orderBy(agentAiChatbotExecutionStep.stepNumber);

    return NextResponse.json({
      success: true,
      task,
      steps,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/agent-ai-chatbot/tasks/[taskId] - Update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const body = await request.json();
    const { status, result, metadata, completedAt } = body;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (result) updateData.result = result;
    if (metadata) updateData.metadata = metadata;
    if (completedAt) updateData.completedAt = new Date(completedAt);

    const [updatedTask] = await db
      .update(agentAiChatbotTask)
      .set(updateData)
      .where(eq(agentAiChatbotTask.id, taskId))
      .returning();

    if (!updatedTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

