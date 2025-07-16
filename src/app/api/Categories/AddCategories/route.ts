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

        // 1) Look up the user in the 'users' table
        const [userInfo] = await db
            .select()
            .from(users)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json(
                { error: "Invalid user." },
                { status: 400 }
            );
        }

        // 2) Retrieve the user's companyId from userInfo
        const companyId = userInfo.companyId;

        // Insert new user
        await db.insert(category).values({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            name: CategoryName,
            companyId: companyId,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
