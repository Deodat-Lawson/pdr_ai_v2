import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import {eq, and } from "drizzle-orm";
import * as console from "console";

type PostBody = {
    userId: string;
};

export async function POST(request: Request) {
    try {
        const { userId } = (await request.json()) as PostBody;

        // 1) Look up the user in the 'users' table
        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json(
                { error: "Invalid user." },
                { status: 400 }
            );
        }

        // 2) Retrieve the user's companyId from userInfo
        const companyId = userInfo.companyId;

        // 3) Select all documents that have the same companyId
        const docs = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.companyId, companyId),
                )
            );

        // Return as JSON
        return NextResponse.json(docs, { status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}