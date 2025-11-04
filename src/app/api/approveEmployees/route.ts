import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import * as console from "console";

type PostBody = {
    employeeId: string;
}


export async function POST(request: Request) {
    try {
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

        const { employeeId } = (await request.json()) as PostBody;

        await db
            .update(users)
            .set({
                status: "verified"
            })
            .where(eq(users.id, Number(employeeId)));

        return NextResponse.json({ status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}