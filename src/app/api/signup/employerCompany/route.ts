import {db} from "~/server/db";
import {company, users} from "~/server/db/schema";
import {NextResponse} from "next/server";
import console from "console";
import {eq} from "drizzle-orm";

type PostBody = {
    userId: string;
    companyName: string;
    name: string;
    email: string;
    employerPasskey: string;
    employeePasskey: string;
    numberOfEmployees: string;
}



export async function POST(request: Request) {
    try {
        const {userId, name, email, companyName, employerPasskey, employeePasskey, numberOfEmployees} = (await request.json()) as PostBody;

        // Check if company already exists
        const [existingCompany] = await db
            .select()
            .from(company)
            .where(eq(company.name, companyName));

        if (existingCompany) {
            return NextResponse.json(
                { error: "Company already exists." },
                { status: 400 }
            );
        }


        const [newCompany] = await db
            .insert(company)
            .values({
                name: companyName,
                employerpasskey: employerPasskey,  // MUST match the property name in createTable
                employeepasskey: employeePasskey,  // Ditto
                numberOfEmployees: numberOfEmployees || "0",
            })
            .returning({ id: company.id });

        if(!newCompany) {
            return NextResponse.json(
                { error: "Could not create company." },
                { status: 400 }
            );
        }

        const companyId = newCompany.id.toString();


        await db.insert(users).values({
            userId,
            companyId,
            name,
            email,
            status: "verified",
            role: "owner",
        });

        return NextResponse.json({ success: true });

    }
    catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error: error}, { status: 500 });
    }
}



