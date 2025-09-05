import { NextResponse } from 'next/server';
import { db } from "../../../server/db/index";
import { document, ChatHistory, documentReferenceResolution } from "../../../server/db/schema";
import { eq } from "drizzle-orm";

type PostBody = {
    docId: string;
};

export async function DELETE(request: Request) {
    try {
        const { docId } = (await request.json()) as PostBody;
        const documentId = Number(docId);

        await db.delete(ChatHistory).where(eq(ChatHistory.documentId, docId));
        await db.delete(documentReferenceResolution).where(
            eq(documentReferenceResolution.resolvedInDocumentId, documentId)
        );
        
        //TODO: Delete pdfChunks of the document
        await db.delete(document).where(eq(document.id, documentId));

        return NextResponse.json({ 
            success: true, 
            message: 'Document and all related data deleted successfully' 
        }, { status: 200 });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ 
            error: 'Error deleting document and related data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}