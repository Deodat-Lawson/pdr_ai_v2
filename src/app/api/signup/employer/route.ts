import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { users, company } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import { validateRequestBody, SignupEmployerSchema } from "~/lib/validation";


export async function POST(request: Request) {
    try {
        // Validate request body
        const validation = await validateRequestBody(request, SignupEmployerSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId, name, email, employerPasskey, companyName } = validation.data;

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
            return NextResponse.json(
                {
                    success: false,
                    error: "Validation Error",
                    message: "Invalid company name or employer passkey. Please check your credentials."
                },
                { status: 400 }
            );
        }

        const companyId = existingCompany.id.toString();

        await db.insert(users).values({
            userId,
            name,
            email,
            companyId,
            status: "pending",
            role: "employer",
        });

        return NextResponse.json({
            success: true,
            message: "Employer account created successfully. Awaiting approval."
        });
    } catch (error: unknown) {
        console.error("Error during employer signup:", error);
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