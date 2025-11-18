const mockValidateRequestBody = jest.fn();

// Mock env module before any imports
jest.mock("~/env", () => ({
    env: {
        DATABASE_URL: "postgresql://test",
        OPENAI_API_KEY: "test-key",
        CLERK_SECRET_KEY: "test-clerk-key",
        UPLOADTHING_TOKEN: "test-upload-token",
        TAVILY_API_KEY: "test-tavily-key",
        NODE_ENV: "test",
    },
}));

jest.mock("~/lib/validation", () => {
    const actual = jest.requireActual("~/lib/validation");
    return {
        ...actual,
        validateRequestBody: (...args: unknown[]) => mockValidateRequestBody(...args),
    };
});

const mockAuth = jest.fn();

import { POST } from "~/app/api/AIAssistant/route";
jest.mock("@clerk/nextjs/server", () => ({
    auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockDbSelect = jest.fn();
jest.mock("~/server/db/index", () => ({
    db: {
        select: (...args: unknown[]) => mockDbSelect(...args),
        execute: jest.fn(),
    },
}));

const buildSelectChain = (rows: unknown[]) => {
    const limit = jest.fn().mockResolvedValue(rows);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    return { from };
};

const baseRequest = () =>
    new Request("http://localhost/api/AIAssistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });

describe("POST /api/AIAssistant access control", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when the user is not authenticated", async () => {
        mockValidateRequestBody.mockResolvedValue({
            success: true,
            data: {
                documentId: 1,
                question: "Test?",
                searchScope: "document",
            },
        });
        mockAuth.mockResolvedValue({ userId: null });

        const response = await POST(baseRequest());
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.message).toBe("Unauthorized");
    });

    it("blocks company-wide search for non-employer roles", async () => {
        mockValidateRequestBody.mockResolvedValue({
            success: true,
            data: {
                companyId: 5,
                question: "Test?",
                searchScope: "company",
            },
        });
        mockAuth.mockResolvedValue({ userId: "user-1" });
        mockDbSelect.mockReturnValueOnce(
            buildSelectChain([
                { userId: "user-1", companyId: "5", role: "employee" },
            ]),
        );

        const response = await POST(baseRequest());
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload.message).toContain("employer");
    });

    it("returns 403 when the document belongs to another company", async () => {
        mockValidateRequestBody.mockResolvedValue({
            success: true,
            data: {
                documentId: 42,
                question: "Test?",
                searchScope: "document",
            },
        });
        mockAuth.mockResolvedValue({ userId: "user-1" });

        mockDbSelect
            .mockReturnValueOnce(
                buildSelectChain([
                    { userId: "user-1", companyId: "5", role: "employee" },
                ]),
            )
            .mockReturnValueOnce(
                buildSelectChain([{ id: 42, companyId: "17" }]),
            );

        const response = await POST(baseRequest());
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload.message).toContain("access");
    });
});
