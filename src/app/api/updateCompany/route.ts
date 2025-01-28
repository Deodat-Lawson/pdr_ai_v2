import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { company, users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import * as console from "console";

type UpdateCompanyBody = {
    userId: string;
    name: string;
    employerPasskey: string;
    employeePasskey: string;
    numberOfEmployees: string;
};

export async function PUT(request: Request) {
    try {
        const {
            userId,
            name,
            employerPasskey,
            employeePasskey,
            numberOfEmployees
        } = (await request.json()) as UpdateCompanyBody;

        // 1) Validate user
        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            return NextResponse.json({ error: "Invalid user." }, { status: 400 });
        }

        // 2) Use companyId from the user’s record
        const companyId = userInfo.companyId;

        // 3) Update company data
        await db
            .update(company)
            .set({
                name,
                employerpasskey: employerPasskey,
                employeepasskey: employeePasskey,
                numberOfEmployees: numberOfEmployees ?? "0"
            })
            .where(eq(company.id, Number(companyId)))
            .returning({ id: company.id });

        // 4) Return success response
        return NextResponse.json({ status: 200 });
    } catch (error: unknown) {
        console.error("Error updating company:", error);
        return NextResponse.json(
            { error: "Unable to update company" },
            { status: 500 }
        );
    }
}
