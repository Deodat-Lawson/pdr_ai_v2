import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { users, company } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import { handleApiError, createSuccessResponse, createValidationError } from "~/lib/api-utils";

type PostBody = {
    userId: string;
    name: string;
    email: string;
    employeePasskey: string;
    companyName: string;
};

export async function POST(request: Request) {
    try {
        const { userId, name, email, employeePasskey, companyName } = (await request.json()) as PostBody;

        // Find company by company name
        const [existingCompany] = await db
            .select()
            .from(company)
            .where(
                and(
                    eq(company.name, companyName),
                    eq(company.employeepasskey, employeePasskey)
                )
            );

        if (!existingCompany) {
            return createValidationError(
                "Invalid company name or passkey. Please check your credentials and try again."
            );
        }

        // Insert new user
        await db.insert(users).values({
            userId,
            name: name,
            email: email,
            companyId: existingCompany.id.toString(),
            status: "pending",
            role: "employee",
        });

        return createSuccessResponse(
            { userId, role: "employee" },
            "Employee account created successfully. Awaiting approval."
        );
    } catch (error: unknown) {
        console.error("Error during employee signup:", error);
        return handleApiError(error);
    }
}