import { POST } from "~/app/api/uploadDocument/route";
import { validateRequestBody } from "~/lib/validation";
import { db } from "~/server/db/index";

jest.mock("~/lib/validation", () => {
  const actual = jest.requireActual("~/lib/validation");
  return {
    ...actual,
    validateRequestBody: jest.fn(),
  };
});

jest.mock("~/server/db/index", () => ({
  db: {
    select: jest.fn(),
    transaction: jest.fn(),
  },
}));

const mockFetch = jest.fn();

jest.mock("node-fetch", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockFetch(...args),
}));

const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();

jest.mock("fs/promises", () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

const mockLoad = jest.fn();
jest.mock("@langchain/community/document_loaders/fs/pdf", () => ({
  PDFLoader: jest.fn().mockImplementation(() => ({
    load: (...args: unknown[]) => mockLoad(...args),
  })),
}));

const mockSplitDocuments = jest.fn();
jest.mock("@langchain/textsplitters", () => ({
  RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
    splitDocuments: (...args: unknown[]) => mockSplitDocuments(...args),
  })),
}));

const mockEmbedDocuments = jest.fn();
jest.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedDocuments: (...args: unknown[]) => mockEmbedDocuments(...args),
  })),
}));

describe("POST /api/uploadDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteFile.mockReset();
    mockUnlink.mockReset();
    mockLoad.mockReset();
    mockSplitDocuments.mockReset();
    mockEmbedDocuments.mockReset();
    mockFetch.mockReset();
    mockWriteFile.mockImplementation(async () => undefined);
    mockUnlink.mockImplementation(async () => undefined);
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("uploads and processes a document successfully", async () => {
    (validateRequestBody as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        userId: "user-1",
        documentName: "Example Document ",
        documentUrl: "https://example.com/doc.pdf",
        documentCategory: "contracts",
      },
    });

    const mockWhere = jest.fn().mockResolvedValue([
      { userId: "user-1", companyId: "5" },
    ]);

    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const pdfBuffer = Buffer.from("%PDF test content");
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => pdfBuffer,
    });

    mockLoad.mockResolvedValue([
      { pageContent: "Full content", metadata: { loc: { pageNumber: 2 } } },
    ]);

    mockSplitDocuments.mockResolvedValue([
      { pageContent: "Chunk content", metadata: { loc: { pageNumber: 2 } } },
    ]);

    mockEmbedDocuments.mockResolvedValue([[0.1, 0.2, 0.3]]);

    const insertedDocument = {
      id: 42,
      url: "https://example.com/doc.pdf",
      category: "contracts",
      title: "Example Document",
      companyId: "5",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
      const insertDocumentValues = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([insertedDocument]),
      });

      const insertChunksValues = jest.fn().mockResolvedValue(undefined);

      const tx = {
        insert: jest
          .fn()
          .mockReturnValueOnce({ values: insertDocumentValues })
          .mockReturnValueOnce({ values: insertChunksValues }),
      };

      await callback(tx);
    });

    const request = new Request("http://localhost/api/uploadDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.document).toMatchObject({
      id: insertedDocument.id,
      url: insertedDocument.url,
      category: insertedDocument.category,
      title: insertedDocument.title,
      companyId: insertedDocument.companyId,
    });
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockUnlink).toHaveBeenCalledTimes(1);
    expect(mockUnlink.mock.calls[0][0]).toContain("pdr-ai-upload-");
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("cleans up temporary file when processing fails", async () => {
    (validateRequestBody as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        userId: "user-2",
        documentName: "Broken Document",
        documentUrl: "https://example.com/broken.pdf",
        documentCategory: "finance",
      },
    });

    const mockWhere = jest.fn().mockResolvedValue([
      { userId: "user-2", companyId: "7" },
    ]);

    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

    const pdfBuffer = Buffer.from("%PDF test content");
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => pdfBuffer,
    });

    mockLoad.mockResolvedValue([
      { pageContent: "Full content", metadata: { loc: { pageNumber: 1 } } },
    ]);

    mockSplitDocuments.mockResolvedValue([
      { pageContent: "Chunk content", metadata: { loc: { pageNumber: 1 } } },
    ]);

    mockEmbedDocuments.mockResolvedValue([[0.1, 0.2]]);

    (db.transaction as jest.Mock).mockImplementation(async () => {
      throw new Error("transaction failed");
    });

    const request = new Request("http://localhost/api/uploadDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(500);
    expect(mockUnlink).toHaveBeenCalledTimes(1);
    expect(mockUnlink.mock.calls[0][0]).toContain("pdr-ai-upload-");
  });

  it("returns validation response when request body is invalid", async () => {
    const validationResponse = new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400 },
    );

    (validateRequestBody as jest.Mock).mockResolvedValue({
      success: false,
      response: validationResponse,
    });

    const request = new Request("http://localhost/api/uploadDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "Invalid request" });
    expect(db.select).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});
