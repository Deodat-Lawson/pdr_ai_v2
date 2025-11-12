import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { users, company } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import { validateRequestBody, SignupEmployeeSchema } from "~/lib/validation";

export async function POST(request: Request) {
    try {
        // Validate request body
        const validation = await validateRequestBody(request, SignupEmployeeSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId, name, email, employeePasskey, companyName } = validation.data;

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
            return NextResponse.json(
                {
                    success: false,
                    error: "Validation Error",
                    message: "Invalid company name or employee passkey. Please check your credentials."
                },
                { status: 400 }
            );
        }

        // Insert new user
        await db.insert(users).values({
            userId,
            name,
            email,
            companyId: existingCompany.id.toString(),
            status: "pending",
            role: "employee",
        });

        return NextResponse.json({
            success: true,
            message: "Employee account created successfully. Awaiting approval."
        });
    } catch (error: unknown) {
        console.error("Error during employee signup:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Registration failed",
                message: "An error occurred during registration. Please try again."
            },
            { status: 500 }
        );
    }
}