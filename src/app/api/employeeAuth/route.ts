import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import * as console from "console";

type PostBody = {
    userId: string;
};

export async function POST(request: Request) {
    try {
        const { userId } = (await request.json()) as PostBody;

        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (userInfo.role !== "employee") {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        if(userInfo.status !== "verified"){
            return NextResponse.json({ error: "User not verified" }, { status: 300 });
        }

        return NextResponse.json(userInfo.role, { status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}