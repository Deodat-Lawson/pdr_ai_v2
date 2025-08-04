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

        // Delete related records sequentially (no transaction support in neon-http driver)
        
        // 1. Delete chat history records for this document
        // Note: ChatHistory uses varchar for documentId, so we need to delete manually
        const chatHistoryResult = await db.delete(ChatHistory).where(eq(ChatHistory.documentId, docId));

        // 2. Delete document reference resolutions that point to this document
        const referenceResult = await db.delete(documentReferenceResolution).where(
            eq(documentReferenceResolution.resolvedInDocumentId, documentId)
        );

        // 3. Delete the document itself
        // This will automatically cascade to:
        // - pdfChunks (has onDelete: "cascade" foreign key)
        // - predictiveDocumentAnalysisResults (has onDelete: "cascade" foreign key)
        const documentResult = await db.delete(document).where(eq(document.id, documentId));

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