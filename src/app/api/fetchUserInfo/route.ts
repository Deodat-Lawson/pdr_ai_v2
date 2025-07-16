import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { company, users } from "../../../server/db/schema";
import { and, eq } from "drizzle-orm";
import * as console from "console";

type PostBody = {
    userId: string;
};

export async function POST(request: Request) {
    try {
        const { userId } = (await request.json()) as PostBody;
        console.log("user id", userId);

        // 1) Look up the user in the 'users' table
        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json({ error: "Invalid user." }, { status: 400 });
        }

        const companyId = userInfo.companyId;

        // 2) Fetch the company info using the companyId
        const [companyRecord] = await db
            .select()
            .from(company)
            .where(and(eq(company.id, Number(companyId))));

        if (!companyRecord) {
            return NextResponse.json(
                { error: "Company not found" },
                { status: 404 }
            );
        }

        // Convert ISO date string to a Date and format it
        const submissionDate = new Date(userInfo.createdAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        });

        // 3) Return user info along with the company name
        return NextResponse.json(
            {
                ...userInfo,
                company: companyRecord.name,
                submissionDate: submissionDate,
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error("Error fetching user and company info:", error);
        return NextResponse.json(
            { error: "Unable to fetch user and company info" },
            { status: 500 }
        );
    }
}
