import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { validateRequestBody, EmployeeIdSchema } from "~/lib/validation";


export async function POST(request: Request) {
    try {
        // Validate request body first
        const validation = await validateRequestBody(request, EmployeeIdSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            }, { status: 401 });
        }

        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            }, { status: 401 });
        } else if (userInfo.role !== "employer" && userInfo.role !== "owner") {
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            }, { status: 401 });
        }

        // Use validated data
        const { employeeId } = validation.data;

        await db
            .update(users)
            .set({
                status: "verified"
            })
            .where(eq(users.id, employeeId));

        return NextResponse.json({
            success: true,
            message: "Employee approved successfully"
        });
    } catch (error: unknown) {
        console.error("Error approving employee:", error);
        return NextResponse.json(
            { success: false, error: "Failed to approve employee" },
            { status: 500 }
        );
    }
}