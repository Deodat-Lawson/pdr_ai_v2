import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { document, users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import { validateRequestBody, UserIdSchema } from "~/lib/validation";


export async function POST(request: Request) {
    try {
        const validation = await validateRequestBody(request, UserIdSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId } = validation.data;

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

        const companyId = userInfo.companyId;

        const docs = await db
            .select()
            .from(document)
            .where(eq(document.companyId, companyId));

        return NextResponse.json(docs, { status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}