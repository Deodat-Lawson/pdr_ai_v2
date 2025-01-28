import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import * as console from "console";

export async function GET(request: Request) {
    try {
        // Get the userId from the query string: e.g. ?userId=<value>
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { error: "Missing or invalid userId query parameter." },
                { status: 400 }
            );
        }

        // 1) Look up the user in the 'users' table
        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json({ error: "Invalid user." }, { status: 400 });
        }

        // 2) Retrieve the user's companyId
        const companyId = userInfo.companyId;

        // 3) Select all users that have the same companyId
        // (Adjust filters as needed, e.g., exclude the user itself, filter by role, etc.)
        const docs = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.companyId, companyId)
                    // eq(users.role, "employee"),
                    // ne(users.userId, userId),
                )
            );

        return NextResponse.json(docs, { status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}
