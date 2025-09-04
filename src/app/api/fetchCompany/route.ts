import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { company, users } from "../../../server/db/schema";
import { eq, and } from "drizzle-orm";
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
            return NextResponse.json(
                { error: "Invalid user." },
                { status: 400 }
            );
        }

        const companyId = userInfo.companyId;

        const companies = await db
            .select()
            .from(company)
            .where(and(eq(company.id, Number(companyId))));

        return NextResponse.json(companies, { status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}