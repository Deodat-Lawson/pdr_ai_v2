// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration
import {relations, sql} from "drizzle-orm";
import type { InferSelectModel } from 'drizzle-orm';
import {
    index, text,
    integer, pgTableCreator, serial,
    timestamp,
    varchar,
    jsonb,
    boolean,
    primaryKey,
    foreignKey,
} from "drizzle-orm/pg-core";
import { pgVector } from "~/server/db/pgVector";



/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const pgTable = pgTableCreator((name) => `pdr_ai_v2_${name}`);


export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", {  length: 256 }).notNull(),
    email: varchar("email", {  length: 256 }).notNull(),
    userId: varchar("userId", {  length: 256 }).notNull(),
    companyId: varchar("companyId", {  length: 256 }).notNull(),
    role: varchar("role", {  length: 256 }).notNull(),
    status: varchar("status", {  length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date()
    ),
});

export const company = pgTable('company', {
    id: serial("id").primaryKey(),
    name: varchar("name", {  length: 256 }).notNull(),
    employerpasskey: varchar("employerPasskey", {  length: 256 }).notNull(),
    employeepasskey: varchar("employeePasskey", {  length: 256 }).notNull(),
    numberOfEmployees: varchar("numberOfEmployees",{  length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date()
    ),
});

export const document = pgTable('document', {
    id: serial("id").primaryKey(),
    url: varchar("url", {  length: 256 }).notNull(),
    category: varchar("category", {  length: 256 }).notNull(),
    title: varchar("title", {  length: 256 }).notNull(),
    companyId: varchar("company id", {  length: 256 }).notNull(),
    ocrEnabled: boolean("ocr_enabled").default(false),
    ocrProcessed: boolean("ocr_processed").default(false),
    ocrMetadata: jsonb("ocr_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date()
    ),
});

export const category = pgTable('category', {
    id: serial("id").primaryKey(),
    name: varchar("name", {  length: 256 }).notNull(),
    companyId: varchar("company id", {  length: 256 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date()
    ),
});



export const pdfChunks = pgTable("pdf_chunks", {
    id: serial("id").primaryKey(),

    documentId: integer("document_id")
        .notNull()
        .references(() => document.id, { onDelete: "cascade" }),

    page: integer("page").notNull(),
    content: text("content").notNull(),
    embedding: pgVector({ dimension: 1536 })("embedding"),

});



export const ChatHistory = pgTable('chatHistory', {
    id: serial("id").primaryKey(),
    UserId: varchar("company id", {  length: 256 }).notNull(), // need to fix this 
    documentId: varchar("document id", {  length: 256 }).notNull(),
    documentTitle: varchar("document title", {  length: 256 }).notNull(),
    question: varchar("question", {length: 256}).notNull(),
    response: text("response").notNull(),
    pages: integer("pages").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date()
    ),
});

export const predictiveDocumentAnalysisResults = pgTable('predictive_document_analysis_results', {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull().references(() => document.id, { onDelete: "cascade" }),
    analysisType: varchar("analysis_type", {  length: 256 }).notNull(),
    includeRelatedDocs: boolean("include_related_docs").default(false),
    resultJson: jsonb("result_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

// this is used to store the reference resolution results for a document. So the tool don't need to repreocess the same document again
export const documentReferenceResolution = pgTable('document_reference_resolutions', {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => company.id, { onDelete: "cascade" }),
    referenceName: varchar("reference_name", {  length: 256 }).notNull(),
    resolvedInDocumentId: integer("resolved_in_document_id"),
    resolutionDetails: jsonb("resolution_details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, 
(table) => ({
    companyRefId: index("document_reference_resolutions_company_ref_idx").on(table.companyId),
}));

export const documentsRelations = relations(document, ({ many }) => ({
    pdfChunks: many(pdfChunks),
}));

export const pdfChunksRelations = relations(pdfChunks, ({ one }) => ({
    document: one(document, {
        fields: [pdfChunks.documentId],
        references: [document.id],
    }),
}));

export const aiChatbotChat = pgTable('ai_chatbot_chat', {
    id: varchar("id", { length: 256 }).primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    title: text("title").notNull(),
    userId: varchar("user_id", { length: 256 })
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    visibility: varchar("visibility", { length: 20, enum: ['public', 'private'] })
        .notNull()
        .default('private'),
});

export const aiChatbotMessage = pgTable('ai_chatbot_message', {
    id: varchar("id", { length: 256 }).primaryKey().notNull(),
    chatId: varchar("chat_id", { length: 256 })
        .notNull()
        .references(() => aiChatbotChat.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
});

export const aiChatbotVote = pgTable(
    'ai_chatbot_vote',
    {
        chatId: varchar("chat_id", { length: 256 })
            .notNull()
            .references(() => aiChatbotChat.id, { onDelete: "cascade" }),
        messageId: varchar("message_id", { length: 256 })
            .notNull()
            .references(() => aiChatbotMessage.id, { onDelete: "cascade" }),
        isUpvoted: boolean("is_upvoted").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    })
);

export const aiChatbotDocument = pgTable(
    'ai_chatbot_document',
    {
        id: varchar("id", { length: 256 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        title: text("title").notNull(),
        content: text("content"),
        kind: varchar("kind", { length: 20, enum: ['text', 'code', 'image', 'sheet'] })
            .notNull()
            .default('text'),
        userId: varchar("user_id", { length: 256 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.id, table.createdAt] }),
    })
);

export const aiChatbotSuggestion = pgTable(
    'ai_chatbot_suggestion',
    {
        id: varchar("id", { length: 256 }).primaryKey().notNull(),
        documentId: varchar("document_id", { length: 256 }).notNull(),
        documentCreatedAt: timestamp("document_created_at", { withTimezone: true }).notNull(),
        originalText: text("original_text").notNull(),
        suggestedText: text("suggested_text").notNull(),
        description: text("description"),
        isResolved: boolean("is_resolved").notNull().default(false),
        userId: varchar("user_id", { length: 256 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
    },
    (table) => ({
        documentRef: foreignKey({
            columns: [table.documentId, table.documentCreatedAt],
            foreignColumns: [aiChatbotDocument.id, aiChatbotDocument.createdAt],
        }),
    })
);

// AI Chatbot Relations
export const aiChatbotUserRelations = relations(users, ({ many }) => ({
    chats: many(aiChatbotChat),
    documents: many(aiChatbotDocument),
    suggestions: many(aiChatbotSuggestion),
}));

export const aiChatbotChatRelations = relations(aiChatbotChat, ({ one, many }) => ({
    user: one(users, {
        fields: [aiChatbotChat.userId],
        references: [users.id],
    }),
    messages: many(aiChatbotMessage),
    votes: many(aiChatbotVote),
}));

export const aiChatbotMessageRelations = relations(aiChatbotMessage, ({ one, many }) => ({
    chat: one(aiChatbotChat, {
        fields: [aiChatbotMessage.chatId],
        references: [aiChatbotChat.id],
    }),
    votes: many(aiChatbotVote),
}));

export const aiChatbotVoteRelations = relations(aiChatbotVote, ({ one }) => ({
    chat: one(aiChatbotChat, {
        fields: [aiChatbotVote.chatId],
        references: [aiChatbotChat.id],
    }),
    message: one(aiChatbotMessage, {
        fields: [aiChatbotVote.messageId],
        references: [aiChatbotMessage.id],
    }),
}));

export const aiChatbotDocumentRelations = relations(aiChatbotDocument, ({ one, many }) => ({
    user: one(users, {
        fields: [aiChatbotDocument.userId],
        references: [users.id],
    }),
    suggestions: many(aiChatbotSuggestion),
}));

export const aiChatbotSuggestionRelations = relations(aiChatbotSuggestion, ({ one }) => ({
    user: one(users, {
        fields: [aiChatbotSuggestion.userId],
        references: [users.id],
    }),
    document: one(aiChatbotDocument, {
        fields: [aiChatbotSuggestion.documentId, aiChatbotSuggestion.documentCreatedAt],
        references: [aiChatbotDocument.id, aiChatbotDocument.createdAt],
    }),
}));



