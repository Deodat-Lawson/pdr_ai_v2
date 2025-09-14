CREATE TABLE "pdr_ai_v2_document_reference_resolutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"reference_name" varchar(256) NOT NULL,
	"resolved_in_document_id" integer,
	"resolution_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdr_ai_v2_predictive_document_analysis_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"analysis_type" varchar(256) NOT NULL,
	"include_related_docs" boolean DEFAULT false,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" ALTER COLUMN "response" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" ADD COLUMN "document id" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" ADD COLUMN "document title" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" ADD COLUMN "pages" integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_document_reference_resolutions" ADD CONSTRAINT "pdr_ai_v2_document_reference_resolutions_company_id_pdr_ai_v2_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."pdr_ai_v2_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_predictive_document_analysis_results" ADD CONSTRAINT "pdr_ai_v2_predictive_document_analysis_results_document_id_pdr_ai_v2_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pdr_ai_v2_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_reference_resolutions_company_ref_idx" ON "pdr_ai_v2_document_reference_resolutions" USING btree ("company_id");