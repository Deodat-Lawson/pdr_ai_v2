import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { sql } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

type PostBody = {
    documentId: number;
    analysisType?: keyof typeof ANALYSIS_TYPES;
    includeRelatedDocs?: boolean;
};

type PdfChunkRow = Record<string, unknown> & {
    id: number;
    content: string;
    page: number;
    distance: number;
};

type DocumentReference = {
    type: 'explicit' | 'implicit' | 'contextual';
    reference: string;
    context: string;
    page: number;
    confidence: number;
    urgency: 'high' | 'medium' | 'low';
};

type MissingDocumentPrediction = {
    documentName: string;
    documentType: string;
    reason: string;
    references: DocumentReference[];
    likelyLocation: string;
    alternatives: string[];
    businessImpact: string;
    confidence: number;
};

type PredictiveAnalysisResult = {
    missingDocuments: MissingDocumentPrediction[];
    brokenReferences: Array<{
        reference: string;
        expectedDocument: string;
        context: string;
        page: number;
        severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
    documentGaps: Array<{
        category: string;
        description: string;
        suggestedDocuments: string[];
        businessJustification: string;
    }>;
    completenessScore: number;
    recommendations: Array<{
        priority: 'immediate' | 'high' | 'medium' | 'low';
        action: string;
        description: string;
        expectedDocuments: string[];
    }>;
};

const ANALYSIS_TYPES = {
    contract: `You are a contract analysis AI expert. Analyze the document chunks to identify missing contract-related documents, exhibits, addendums, and dependencies.

    Look for:
    - Explicit references (Exhibit A, Schedule B, Addendum C, etc.)
    - Implicit dependencies (referenced policies, procedures, standards)
    - Required supporting documents (certificates, licenses, approvals)
    - Cross-references to other agreements
    - Compliance documents that should exist
    - Signature pages or executed versions
    - Amendment or modification documents

    Pay special attention to legal language that implies other documents should exist.`,

    financial: `You are a financial document analysis AI. Identify missing financial reports, supporting documentation, and regulatory filings.

    Look for:
    - Referenced financial statements or reports
    - Supporting schedules and worksheets
    - Audit reports or certifications
    - Regulatory filings mentioned
    - Budget documents or forecasts
    - Tax returns or assessments
    - Banking or investment documents
    - Insurance policies or bonds
    - Compliance certifications

    Focus on documents required for financial transparency and regulatory compliance.`,

    technical: `You are a technical documentation analyst AI. Identify missing technical documents, specifications, and project deliverables.

    Look for:
    - Technical specifications or requirements
    - Design documents or blueprints
    - Testing reports or certifications
    - User manuals or documentation
    - API documentation or schemas
    - Configuration files or scripts
    - Deployment guides or procedures
    - Security assessments or audits
    - Performance benchmarks or reports

    Focus on documentation gaps that could impact project delivery or system operation.`,

    compliance: `You are a compliance documentation expert AI. Identify missing regulatory, policy, and governance documents.

    Look for:
    - Regulatory filings or submissions
    - Policy documents or procedures
    - Training materials or certifications
    - Risk assessments or audits
    - Incident reports or investigations
    - Approval letters or permits
    - Monitoring or inspection reports
    - Corrective action plans
    - Due diligence documentation

    Emphasize documents critical for regulatory compliance and risk management.`,

    general: `You are a document completeness analyst AI. Identify missing documents across all categories that are referenced or implied in the content.

    Look for:
    - Any explicit document references
    - Implied supporting documentation
    - Standard business documents that should accompany the content
    - Cross-references to other materials
    - Documents mentioned in passing
    - Required certifications or approvals
    - Related correspondence or communications

    Cast a wide net to identify any potential document gaps.`
};

export async function POST(request: Request) {
    try {
        const { documentId, analysisType = 'general', includeRelatedDocs = false } = (await request.json()) as PostBody;
        console.log("Document ID:", documentId);
        console.log("Analysis Type:", analysisType);
        console.log("Include Related Docs:", includeRelatedDocs);

        const query = sql`
          SELECT
            id,
            content,
            page
          FROM pdr_ai_v2_pdf_chunks
          WHERE document_id = ${documentId}
          ORDER BY page, id
        `;

        const result = await db.execute<PdfChunkRow>(query);
        const rows = result.rows;

        if (rows.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No chunks found for the given documentId.",
            });
        }

        // let existingDocuments: string[] = [];
        // if (includeRelatedDocs) {
        //     const existingDocsQuery = sql`
        //       SELECT DISTINCT title, file_name
        //       FROM pdr_ai_v2_documents
        //       WHERE user_id = (SELECT user_id FROM pdr_ai_v2_documents WHERE id = ${documentId})
        //       AND id != ${documentId}
        //     `;
            
        //     const existingDocsResult = await db.execute(existingDocsQuery);
        //     existingDocuments = existingDocsResult.rows.map(row => 
        //         `${row.title || row.file_name}`
        //     );
        // }

        const combinedContent = rows
            .map((row) => `=== Page ${row.page} ===\n${row.content}`)
            .join("\n\n");

        const chat = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4.1",
            temperature: 0.2,
        });

        const analysisPrompt = `
        MISSING DOCUMENT ANALYSIS REQUEST:
    
        
        DOCUMENT CONTENT TO ANALYZE:
        ${combinedContent}
        
        ANALYSIS TASK:
        Carefully analyze the document content above and identify ANY missing or referenced documents that should exist but may not be uploaded. Look for:
        
        1. EXPLICIT REFERENCES: Direct mentions of other documents (Exhibit A, Schedule B, Attachment C, etc.)
        2. IMPLICIT DEPENDENCIES: Documents that logically should exist based on the content
        3. BROKEN REFERENCES: References to documents that don't appear to exist
        4. CONTEXTUAL GAPS: Missing documents that would be expected in this business context
        
        Return your analysis in the following JSON structure:
        
        {
          "missingDocuments": [
            {
              "documentName": "exact name or description",
              "documentType": "category of document",
              "reason": "why this document should exist",
              "references": [
                {
                  "type": "explicit|implicit|contextual",
                  "reference": "exact text reference",
                  "context": "surrounding context",
                  "page": page_number,
                  "confidence": 0.95,
                  "urgency": "high|medium|low"
                }
              ],
              "likelyLocation": "where this document might be found",
              "alternatives": ["alternative document names"],
              "businessImpact": "impact of missing this document",
              "confidence": 0.85
            }
          ],
          "brokenReferences": [
            {
              "reference": "the broken reference text",
              "expectedDocument": "what document should exist",
              "context": "context where reference appears",
              "page": page_number,
              "severity": "critical|high|medium|low"
            }
          ],
          "documentGaps": [
            {
              "category": "type of gap",
              "description": "description of what's missing",
              "suggestedDocuments": ["list of suggested documents"],
              "businessJustification": "why these documents are typically needed"
            }
          ],
          "completenessScore": 0.75,
          "recommendations": [
            {
              "priority": "immediate|high|medium|low",
              "action": "recommended action",
              "description": "detailed description",
              "expectedDocuments": ["specific documents to find"]
            }
          ]
        }
        
        Be thorough and specific. Look for subtle references and implied dependencies.
        `;

        const response = await chat.call([
            new SystemMessage(ANALYSIS_TYPES[analysisType]),
            new HumanMessage(analysisPrompt)
        ]);

        let analysisResult: PredictiveAnalysisResult;
        try {
            analysisResult = JSON.parse(response.text);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            analysisResult = {
                missingDocuments: [],
                brokenReferences: [],
                documentGaps: [],
                completenessScore: 0.5,
                recommendations: []
            };
        }

        // Calculate summary statistics
        const totalReferences = analysisResult.missingDocuments.reduce(
            (sum, doc) => sum + doc.references.length, 0
        );
        
        const highUrgencyCount = analysisResult.missingDocuments.filter(
            doc => doc.references.some(ref => ref.urgency === 'high')
        ).length;

        const criticalIssuesCount = analysisResult.brokenReferences.filter(
            ref => ref.severity === 'critical'
        ).length;

        return NextResponse.json({
            success: true,
            documentId,
            analysisType,
            summary: {
                totalMissingDocuments: analysisResult.missingDocuments.length,
                totalReferences: totalReferences,
                highUrgencyItems: highUrgencyCount,
                criticalIssues: criticalIssuesCount,
                completenessScore: analysisResult.completenessScore,
                analysisTimestamp: new Date().toISOString()
            },
            analysis: analysisResult,
            metadata: {
                pagesAnalyzed: rows.length,
                existingDocumentsChecked: 1,
                existingDocuments: []
            }
        });

    } catch (error: unknown) {
        console.error("Predictive Document Analysis Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: String(error),
            message: "Failed to perform predictive document analysis"
        }, { status: 500 });
    }
}