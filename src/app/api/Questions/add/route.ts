import { NextResponse } from "next/server";
import { db } from "~/server/db/index";
import { ChatHistory } from "~/server/db/schema";

type PostBody = {
    userId: string;
    question: string;
    documentId: string;
    documentTitle: string;
    response: string;
    pages: number[];
};

export async function POST(request: Request) {
    try {
        const { userId, question, documentId, documentTitle, response, pages } = (await request.json()) as PostBody;

        await db.insert(ChatHistory).values({
            UserId: userId,
            documentId: documentId,
            documentTitle: documentTitle,
            question: question,
            response: response,
            pages: pages,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
