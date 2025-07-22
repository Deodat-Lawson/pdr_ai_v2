// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration
import {relations, sql} from "drizzle-orm";
import {
    index, text,
    integer, pgTableCreator, serial,
    timestamp,
    varchar,
    jsonb,
    boolean,
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

    // Which document this chunk belongs to
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
    response: varchar("response", {length: 1024}).notNull(),
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

export const documentsRelations = relations(document, ({ many }) => ({
    pdfChunks: many(pdfChunks),
}));

export const pdfChunksRelations = relations(pdfChunks, ({ one }) => ({
    document: one(document, {
        fields: [pdfChunks.documentId],
        references: [document.id],
    }),
}));



