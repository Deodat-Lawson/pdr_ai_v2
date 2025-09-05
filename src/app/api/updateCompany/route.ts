import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { company, users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import * as console from "console";

type PostBody = {
    userId: string;
    name: string;
    employerPasskey: string;
    employeePasskey: string;
    numberOfEmployees: string;
}


export async function POST(request: Request) {
    try {
        const { userId, name, employerPasskey, employeePasskey, numberOfEmployees  } = (await request.json()) as PostBody;

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

        await db //update company
            .update(company)
            .set({
                name: name,
                employerpasskey: employerPasskey,
                employeepasskey: employeePasskey,
                numberOfEmployees: numberOfEmployees ?? '0',
            })
            .where(eq(company.id, Number(companyId)))
            .returning({ id: company.id });

        // Return as JSON
        return NextResponse.json( { status: 200 });
    } catch (error: unknown) {
        console.error("Error fetching documents:", error);
        return NextResponse.json(
            { error: "Unable to fetch documents" },
            { status: 500 }
        );
    }
}