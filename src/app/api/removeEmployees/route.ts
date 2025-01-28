import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { users } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import * as console from "console";

type DeleteBody = {
    employeeId: string;
};

export async function DELETE(request: Request) {
    try {
        // Parse the JSON body from the DELETE request
        const { employeeId } = (await request.json()) as DeleteBody;

        console.log("Employee ID to delete:", employeeId);

        await db.delete(users).where(eq(users.id, Number(employeeId)));

        return NextResponse.json({ status: 200 });
    } catch (error: unknown) {
        console.error("Error deleting employee:", error);
        return NextResponse.json(
            { error: "Unable to delete employee" },
            { status: 500 }
        );
    }
}
