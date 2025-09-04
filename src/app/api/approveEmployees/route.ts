import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import * as console from "console";

type PostBody = {
    employeeId: string;
}


export async function POST(request: Request) {
    try {
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