ALTER TABLE "pdr_ai_v2_document" ADD COLUMN "ocr_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_document" ADD COLUMN "ocr_processed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_document" ADD COLUMN "ocr_metadata" jsonb;