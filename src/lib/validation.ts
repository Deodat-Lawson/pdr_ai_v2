import { z } from "zod";
import { NextResponse } from "next/server";

export const createErrorResponse = (message: string, status = 400) => {
  return NextResponse.json(
    {
      success: false,
      error: "Validation Error",
      message,
    },
    { status }
  );
};

export const validateRequestBody = async <T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> => {
  try {
    const body = await request.json() as unknown;
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        success: false,
        response: createErrorResponse(`Invalid request data: ${errorMessage}`),
      };
    }
    return {
      success: false,
      response: createErrorResponse("Invalid JSON format"),
    };
  }
};

export const DocumentIdSchema = z.object({
  documentId: z.number().int().positive("Document ID must be a positive integer"),
});

export const UserIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const CompanyIdSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
});

export const PredictiveAnalysisSchema = z.object({
  documentId: z.number().int().positive("Document ID must be a positive integer"),
  analysisType: z
    .enum(["contract", "financial", "technical", "compliance", "general"])
    .optional(),
  includeRelatedDocs: z.boolean().optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
  forceRefresh: z.boolean().optional(),
}).transform((data) => ({
  documentId: data.documentId,
  analysisType: data.analysisType ?? "general" as const,
  includeRelatedDocs: data.includeRelatedDocs ?? false,
  timeoutMs: data.timeoutMs ?? 30000,
  forceRefresh: data.forceRefresh ?? false,
}));

export const QuestionSchema = z.object({
  documentId: z.number().int().positive().optional(),
  companyId: z.number().int().positive().optional(),
  question: z.string().min(1, "Question is required").max(2000, "Question is too long"),
  style: z.enum(["concise", "detailed", "academic", "bullet-points"]).optional(),
  searchScope: z.enum(["document", "company"]).optional(),
}).transform((data) => ({
  documentId: data.documentId,
  companyId: data.companyId,
  question: data.question,
  style: data.style ?? "concise" as const,
  searchScope: data.searchScope ?? "document" as const,
}));

export const DeleteDocumentSchema = z.object({
  docId: z.string().min(1, "Document ID is required"),
});

export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(256, "Category name is too long"),
  companyId: z.string().min(1, "Company ID is required"),
});

export const ApproveEmployeeSchema = z.object({
  employeeId: z.number().int().positive("Employee ID must be a positive integer"),
  companyId: z.string().min(1, "Company ID is required"),
});

export const UploadDocumentSchema = z.object({
  userId: z.string().min(1, "User ID is required").max(256, "User ID is too long").trim(),
  documentName: z.string().min(1, "Document name is required").max(256, "Document name is too long").trim(),
  documentUrl: z.string().url("Document URL must be a valid URL").max(2048, "Document URL is too long").trim(),
  documentCategory: z.string().min(1, "Document category is required").max(256, "Document category is too long").trim(),
  enableOCR: z.boolean().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(256, "Company name is too long").trim(),
  employerPasskey: z.string().min(1, "Employer passkey is required").max(256, "Employer passkey is too long").trim(),
  employeePasskey: z.string().min(1, "Employee passkey is required").max(256, "Employee passkey is too long").trim(),
  numberOfEmployees: z
    .string()
    .trim()
    .regex(/^\d*$/, "Number of employees must contain only digits")
    .max(9, "Number of employees is too long")
    .optional(),
}).transform((data) => ({
  name: data.name,
  employerPasskey: data.employerPasskey,
  employeePasskey: data.employeePasskey,
  numberOfEmployees: data.numberOfEmployees && data.numberOfEmployees !== "" ? data.numberOfEmployees : "0",
}));

export const EmployeeAuthSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  companyPasskey: z.string().min(1, "Company passkey is required"),
});

export const EmployerAuthSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  companyPasskey: z.string().min(1, "Company passkey is required"),
});

export const EmployeeIdSchema = z.object({
  employeeId: z.coerce
    .number({
      required_error: "Employee ID is required",
      invalid_type_error: "Employee ID must be a number"
    })
    .int("Employee ID must be an integer")
    .positive("Employee ID must be a positive number"),
});

export const SignupEmployeeSchema = z.object({
  userId: z.string().min(1, "User ID is required").max(256, "User ID is too long").trim(),
  name: z.string().min(1, "Name is required").max(256, "Name is too long").trim(),
  email: z.string().email("Invalid email address").max(256, "Email is too long").trim(),
  employeePasskey: z.string().min(1, "Employee passkey is required").max(256, "Employee passkey is too long"),
  companyName: z.string().min(1, "Company name is required").max(256, "Company name is too long").trim(),
});

export const SignupEmployerSchema = z.object({
  userId: z.string().min(1, "User ID is required").max(256, "User ID is too long").trim(),
  name: z.string().min(1, "Name is required").max(256, "Name is too long").trim(),
  email: z.string().email("Invalid email address").max(256, "Email is too long").trim(),
  employerPasskey: z.string().min(1, "Employer passkey is required").max(256, "Employer passkey is too long"),
  companyName: z.string().min(1, "Company name is required").max(256, "Company name is too long").trim(),
});
