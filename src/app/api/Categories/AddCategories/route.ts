import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { users, category } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateRequestBody } from "~/lib/validation";

const AddCategorySchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    CategoryName: z.string().min(1, "Category name is required").max(256, "Category name is too long"),
});


export async function POST(request: Request) {
    try {
        const validation = await validateRequestBody(request, AddCategorySchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId, CategoryName } = validation.data;

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

        const newCategoryId = await db.insert(category).values({
            name: CategoryName,
            companyId: companyId,
        }).returning({ id: category.id });

        return NextResponse.json({ success: true, id: newCategoryId[0], name: CategoryName });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
