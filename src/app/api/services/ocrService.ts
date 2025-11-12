/**
 * OCR Service for Datalab Marker API Integration
 * Provides functions to submit PDFs for OCR processing and poll for results
 */

export interface OCROptions {
  force_ocr?: boolean;
  use_llm?: boolean;
  output_format?: 'markdown' | 'json' | 'html';
  strip_existing_ocr?: boolean;
  paginate?: boolean;
}

export interface OCRSubmitResponse {
  success: boolean;
  request_id: string;
  request_check_url: string;
  error?: string;
}

export interface OCRResult {
  status: 'complete' | 'processing' | 'failed';
  success: boolean;
  output_format: string;
  markdown?: string;
  json?: unknown;
  html?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  page_count?: number;
}

export interface OCRProcessResult {
  content: string;
  page_count?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Submit a PDF to the Datalab Marker API for OCR processing
 * @param fileUrl - URL of the PDF file to process
 * @param apiKey - Datalab API key
 * @param options - OCR processing options
 * @returns Promise with request ID and polling URL
 */
export async function submitPDFForOCR(
  fileUrl: string,
  apiKey: string,
  options: OCROptions = {}
): Promise<OCRSubmitResponse> {
  try {
    // Download the PDF file first
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download PDF from URL: ${fileResponse.status}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // Create FormData with the file
    const formData = new FormData();
    formData.append('file', blob, 'document.pdf');
    
    // Add optional parameters
    if (options.force_ocr !== undefined) {
      formData.append('force_ocr', String(options.force_ocr));
    }
    if (options.use_llm !== undefined) {
      formData.append('use_llm', String(options.use_llm));
    }
    if (options.output_format) {
      formData.append('output_format', options.output_format);
    }
    if (options.strip_existing_ocr !== undefined) {
      formData.append('strip_existing_ocr', String(options.strip_existing_ocr));
    }
    if (options.paginate !== undefined) {
      formData.append('paginate', String(options.paginate));
    }

    const response = await fetch('https://www.datalab.to/api/v1/marker', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        // Don't set Content-Type - let fetch set it with boundary for multipart/form-data
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { request_id: string; request_check_url: string };

    return {
      success: true,
      request_id: data.request_id,
      request_check_url: data.request_check_url,
    };
  } catch (error) {
    console.error('Error submitting PDF for OCR:', error);
    return {
      success: false,
      request_id: '',
      request_check_url: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Poll the OCR API for completion status
 * @param checkUrl - URL to check processing status
 * @param apiKey - Datalab API key
 * @param maxPolls - Maximum number of polling attempts (default: 60)
 * @param pollInterval - Interval between polls in milliseconds (default: 5000)
 * @returns Promise with OCR result
 */
export async function pollOCRCompletion(
  checkUrl: string,
  apiKey: string,
  maxPolls = 60,
  pollInterval = 5000
): Promise<OCRResult> {
  let attempts = 0;

  while (attempts < maxPolls) {
    try {
      const response = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status}`);
      }

      const data = await response.json() as {
        status: string;
        output_format?: string;
        markdown?: string;
        json?: unknown;
        html?: string;
        metadata?: Record<string, unknown>;
        page_count?: number;
        error?: string;
      };

      // Check if processing is complete
      if (data.status === 'complete') {
        return {
          status: 'complete',
          success: true,
          output_format: data.output_format ?? '',
          markdown: data.markdown,
          json: data.json,
          html: data.html,
          metadata: data.metadata,
          page_count: data.page_count,
        };
      }

      // Check if processing failed
      if (data.status === 'failed') {
        return {
          status: 'failed',
          success: false,
          output_format: '',
          error: data.error ?? 'OCR processing failed',
        };
      }

      // Still processing, wait before next poll
      attempts++;
      if (attempts < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error(`Polling attempt ${attempts + 1} failed:`, error);
      attempts++;
      if (attempts < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
  }

  // Max polls reached
  return {
    status: 'failed',
    success: false,
    output_format: '',
    error: 'OCR processing timeout - maximum polling attempts reached',
  };
}

/**
 * Process a PDF with OCR - orchestrates submit and poll operations
 * @param fileUrl - URL of the PDF file to process
 * @param apiKey - Datalab API key
 * @param options - OCR processing options
 * @returns Promise with extracted text content and metadata
 */
export async function processPDFWithOCR(
  fileUrl: string,
  apiKey: string,
  options: OCROptions = {}
): Promise<OCRProcessResult> {
  // Submit PDF for OCR processing
  const submitResult = await submitPDFForOCR(fileUrl, apiKey, options);

  if (!submitResult.success || !submitResult.request_check_url) {
    throw new Error(submitResult.error ?? 'Failed to submit PDF for OCR processing');
  }

  console.log(`OCR request submitted. Request ID: ${submitResult.request_id}`);

  // Poll for completion
  const ocrResult = await pollOCRCompletion(
    submitResult.request_check_url,
    apiKey,
    60, // Max 60 polls (5 minutes with 5-second intervals)
    5000 // 5 seconds between polls
  );

  if (!ocrResult.success || ocrResult.status !== 'complete') {
    throw new Error(ocrResult.error ?? 'OCR processing failed');
  }

  // Extract content based on output format
  let content = '';
  if (options.output_format === 'markdown' || !options.output_format) {
    content = ocrResult.markdown ?? '';
  } else if (options.output_format === 'html') {
    content = ocrResult.html ?? '';
  } else if (options.output_format === 'json') {
    content = JSON.stringify(ocrResult.json ?? {});
  }

  if (!content) {
    throw new Error('No content extracted from OCR result');
  }

  return {
    content,
    page_count: ocrResult.page_count,
    metadata: ocrResult.metadata,
  };
}
