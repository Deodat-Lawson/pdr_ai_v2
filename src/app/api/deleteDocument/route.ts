import { NextResponse } from 'next/server';
import { db } from "../../../server/db/index";
import { document, ChatHistory, documentReferenceResolution } from "../../../server/db/schema";
import { eq } from "drizzle-orm";
import { validateRequestBody, DeleteDocumentSchema } from "~/lib/validation";


export async function DELETE(request: Request) {
    try {
        const validation = await validateRequestBody(request, DeleteDocumentSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { docId } = validation.data;
        const documentId = Number(docId);

        if (isNaN(documentId) || documentId <= 0) {
            return NextResponse.json({
                success: false,
                error: "Invalid document ID format"
            }, { status: 400 });
        }

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