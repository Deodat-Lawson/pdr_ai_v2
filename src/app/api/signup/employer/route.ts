import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { users, company } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import { handleApiError, createSuccessResponse, createValidationError } from "~/lib/api-utils";

type PostBody = {
    userId: string;
    name: string;
    email: string;
    employerPasskey: string;
    companyName: string;
}


export async function POST(request: Request) {
    try {
        const {userId, name, email, employerPasskey, companyName} = (await request.json()) as PostBody;

        let companyId: string;
        const [existingCompany] = await db
            .select()
            .from(company)
            .where(
                and(
                    eq(company.name, companyName),
                    eq(company.employerpasskey, employerPasskey)
                )
            );

        if (!existingCompany) {
            return createValidationError(
                "Invalid company name or passkey. Please check your credentials and try again."
            );
        }

        // eslint-disable-next-line prefer-const
        companyId = existingCompany.id.toString();

        await db.insert(users).values({
            userId,
            name,
            email,
            companyId,
            status: "pending",
            role: "employer",
        });

        return createSuccessResponse(
            { userId, role: "employer" },
            "Employer account created successfully. Awaiting approval."
        );
    } catch (error: unknown) {
        console.error("Error during employer signup:", error);
        return handleApiError(error);
    }
}