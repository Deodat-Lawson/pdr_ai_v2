import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { users, category } from "~/server/db/schema";
import { eq } from "drizzle-orm";

type PostBody = {
    userId: string;
    CategoryName: string;
};

export async function POST(request: Request) {
    try {
        const { userId, CategoryName } = (await request.json()) as PostBody;

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

        await db.insert(category).values({
            name: CategoryName,
            companyId: companyId,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
