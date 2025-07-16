import { NextResponse } from "next/server";
import { db } from "../../../../server/db/index";
import { category } from "../../../../server/db/schema";
import { eq } from "drizzle-orm";

type PostBody = {
    id: string;
};

export async function DELETE(request: Request) {
    try {
        const { id } = (await request.json()) as PostBody;

        await db.delete(category).where(eq(category.id, Number(id)));

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}