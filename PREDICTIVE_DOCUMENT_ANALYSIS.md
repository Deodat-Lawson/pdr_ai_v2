# Predictive Document Analysis

## Overview

The Predictive Document Analysis feature is an AI-powered document completeness analyzer that helps identify missing documents, broken references, and document gaps in uploaded PDFs. It uses OpenAI's GPT-4.1 model to intelligently analyze document content and provide actionable insights for document management.

## Features

- **Missing Document Detection**: Identifies documents that are referenced but may not be uploaded
- **Broken Reference Analysis**: Detects references to documents that don't appear to exist
- **Document Gap Analysis**: Suggests additional documents that should logically exist
- **Completeness Scoring**: Provides a quantitative assessment of document completeness
- **Smart Recommendations**: Offers prioritized actions to improve document collection
- **Multiple Analysis Types**: Supports different analysis modes for various document types

## Technical Implementation

### Architecture

```
Frontend (React) → API Route → Database → OpenAI GPT-4.1 → Structured Response
```

### Core Components

1. **API Endpoint**: `/api/predictive-document-analysis`
2. **Database Integration**: Queries PDF chunks from `pdr_ai_v2_pdf_chunks` table
3. **AI Processing**: Uses OpenAI's GPT-4.1 with specialized prompts
4. **Frontend Display**: Integrated into the document viewer interface

## API Reference

### Endpoint
```
POST /api/predictive-document-analysis
```

### Request Body
```typescript
{
  documentId: number;                    // Required: ID of document to analyze
  analysisType?: string;                 // Optional: Type of analysis ("general", "contract", "financial", "technical", "compliance")
  includeRelatedDocs?: boolean;          // Optional: Whether to include related documents in analysis
}
```

### Response Structure
```typescript
{
  success: boolean;
  documentId: number;
  analysisType: string;
  summary: {
    totalMissingDocuments: number;
    totalReferences: number;
    highUrgencyItems: number;
    criticalIssues: number;
    completenessScore: number;          // 0.0 to 1.0
    analysisTimestamp: string;
  };
  analysis: {
    missingDocuments: MissingDocument[];
    brokenReferences: BrokenReference[];
    documentGaps: DocumentGap[];
    completenessScore: number;
    recommendations: Recommendation[];
  };
  metadata: {
    pagesAnalyzed: number;
    existingDocumentsChecked: number;
    existingDocuments: string[];
  };
}
```

### Data Types

#### MissingDocument
```typescript
{
  documentName: string;                 // Name of the missing document
  documentType: string;                 // Category/type of document
  reason: string;                       // Why this document should exist
  references: DocumentReference[];      // Array of references found
  likelyLocation: string;               // Where the document might be found
  alternatives: string[];               // Alternative document names
  businessImpact: string;               // Impact of missing this document
  confidence: number;                   // Confidence score (0.0 to 1.0)
}
```

#### DocumentReference
```typescript
{
  type: 'explicit' | 'implicit' | 'contextual';
  reference: string;                    // Exact text reference
  context: string;                      // Surrounding context
  page: number;                         // Page number where found
  confidence: number;                   // Confidence score (0.0 to 1.0)
  urgency: 'high' | 'medium' | 'low';   // Urgency level
}
```

#### BrokenReference
```typescript
{
  reference: string;                    // The broken reference text
  expectedDocument: string;             // What document should exist
  context: string;                      // Context where reference appears
  page: number;                         // Page number
  severity: 'critical' | 'high' | 'medium' | 'low';
}
```

#### DocumentGap
```typescript
{
  category: string;                     // Type of gap
  description: string;                  // Description of what's missing
  suggestedDocuments: string[];         // List of suggested documents
  businessJustification: string;        // Why these documents are needed
}
```

#### Recommendation
```typescript
{
  priority: 'immediate' | 'high' | 'medium' | 'low';
  action: string;                       // Recommended action
  description: string;                  // Detailed description
  expectedDocuments: string[];          // Specific documents to find
}
```

## Analysis Types

### General Analysis
- Broad document completeness check
- Identifies any referenced or implied documents
- Suitable for most document types

### Contract Analysis
- Focuses on contract-specific documents
- Looks for exhibits, schedules, addendums
- Identifies compliance documents
- Checks for signature pages and amendments

### Financial Analysis
- Targets financial reports and supporting documents
- Identifies regulatory filings
- Looks for audit reports and certifications
- Focuses on compliance documentation

### Technical Analysis
- Examines technical specifications and requirements
- Identifies design documents and blueprints
- Looks for testing reports and certifications
- Checks for user manuals and API documentation

### Compliance Analysis
- Focuses on regulatory and policy documents
- Identifies training materials and certifications
- Looks for risk assessments and audits
- Checks for approval letters and permits

## Frontend Integration

### View Mode
The analysis is accessible through the "Predictive Analysis" view mode in the document viewer, represented by a bar chart icon (📊).

### User Interface Components

#### Summary Statistics
Displays key metrics in a grid layout:
- Total Missing Documents
- Critical Issues
- High Urgency Items
- Completeness Score (percentage)

#### Missing Documents Section
- Lists all identified missing documents
- Shows confidence levels and document types
- Provides clickable page references
- Color-coded urgency levels

#### Broken References Section
- Displays references that appear to be broken
- Shows context and page numbers
- Severity indicators (critical, high, medium, low)

#### Recommendations Section
- Prioritized action items
- Detailed descriptions
- Expected documents to find

### User Interactions

1. **View Mode Selection**: Click the bar chart icon to activate predictive analysis
2. **Page Navigation**: Click on page numbers to jump to specific references
3. **Urgency Filtering**: Visual indicators help prioritize urgent items
4. **Detailed Information**: Expandable sections show comprehensive analysis

## Usage Instructions

### For Employers

1. **Upload Documents**: Ensure documents are uploaded and processed
2. **Select Document**: Choose a document from the sidebar
3. **Activate Analysis**: Click the Predictive Analysis icon (📊)
4. **Review Results**: Examine the analysis results and recommendations
5. **Take Action**: Use the insights to identify and upload missing documents

### Best Practices

1. **Regular Analysis**: Run analysis periodically as new documents are added
2. **Prioritize by Urgency**: Focus on high-urgency and critical items first
3. **Cross-Reference**: Use the page navigation to verify references
4. **Document Tracking**: Keep track of identified missing documents
5. **Iterative Improvement**: Re-run analysis after adding missing documents

## Configuration

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key
```

### AI Model Configuration
- **Model**: GPT-4.1
- **Temperature**: 0.2 (for consistent, focused responses)
- **Max Response Length**: Determined by token limits

### Database Requirements
- `pdr_ai_v2_pdf_chunks` table with document chunks
- `pdr_ai_v2_documents` table for document metadata

## Error Handling

### Common Errors

1. **No Chunks Found**: Document hasn't been processed or chunks are missing
2. **OpenAI API Error**: API key issues or service unavailability
3. **JSON Parse Error**: AI response format issues
4. **Database Connection Error**: Database connectivity problems

### Error Responses
```typescript
{
  success: false;
  error: string;
  message: string;
}
```

### Frontend Error Handling
- Loading states with spinner animations
- Error messages with retry options
- Graceful degradation when analysis fails

## Performance Considerations

### Optimization Strategies

1. **Chunk Limit**: Analysis processes all chunks for a document
2. **API Timeouts**: Implement retry logic for OpenAI API calls
3. **Caching**: Consider caching analysis results for unchanged documents
4. **Batch Processing**: Process multiple documents in sequence, not parallel

### Scalability

- **Database Indexing**: Ensure proper indexing on `document_id` and `page` columns
- **API Rate Limits**: Monitor OpenAI API usage and implement rate limiting
- **Resource Management**: Monitor memory usage for large documents

## Future Enhancements

### Planned Features

1. **Document Relationship Mapping**: Visual representation of document connections
2. **Automated Document Suggestions**: AI-powered document recommendations
3. **Historical Analysis**: Track document completeness over time
4. **Custom Analysis Types**: User-defined analysis categories
5. **Export Capabilities**: Export analysis results to various formats

### Integration Possibilities

1. **Document Management Systems**: Integration with external DMS platforms
2. **Workflow Automation**: Trigger actions based on analysis results
3. **Compliance Monitoring**: Automated compliance checking
4. **Reporting Dashboard**: Executive-level completeness reporting

## Troubleshooting

### Common Issues

1. **Empty Analysis Results**: Check if document has been properly processed
2. **Slow Performance**: Verify database indexes and API response times
3. **Inconsistent Results**: Review AI prompts and model temperature settings
4. **Missing References**: Ensure document text extraction is working correctly

### Debugging Steps

1. Check browser console for JavaScript errors
2. Verify API endpoint responses in Network tab
3. Review server logs for OpenAI API errors
4. Confirm database query results
5. Test with different document types

## Security Considerations

### Data Protection
- Document content is sent to OpenAI for analysis
- Ensure compliance with data protection regulations
- Consider data residency requirements

### API Security
- Secure OpenAI API key storage
- Implement request validation
- Monitor API usage for anomalies

### Access Control
- Ensure only authorized users can access analysis features
- Implement proper authentication and authorization
- Log analysis requests for auditing

## Support and Maintenance

### Monitoring
- Track analysis success rates
- Monitor API usage and costs
- Log performance metrics

### Updates
- Regularly update AI prompts for better accuracy
- Monitor OpenAI model updates and changes
- Keep dependencies up to date

For technical support or feature requests, please contact the development team or create an issue in the project repository. 