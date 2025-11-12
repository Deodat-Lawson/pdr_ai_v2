CREATE TABLE "pdr_ai_v2_ai_chatbot_chat" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"title" text NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"visibility" varchar(20) DEFAULT 'private' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdr_ai_v2_ai_chatbot_document" (
	"id" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"kind" varchar(20) DEFAULT 'text' NOT NULL,
	"user_id" varchar(256) NOT NULL,
	CONSTRAINT "pdr_ai_v2_ai_chatbot_document_id_created_at_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE "pdr_ai_v2_ai_chatbot_message" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"chat_id" varchar(256) NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdr_ai_v2_ai_chatbot_suggestion" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"document_id" varchar(256) NOT NULL,
	"document_created_at" timestamp with time zone NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdr_ai_v2_ai_chatbot_vote" (
	"chat_id" varchar(256) NOT NULL,
	"message_id" varchar(256) NOT NULL,
	"is_upvoted" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "pdr_ai_v2_ai_chatbot_vote_chat_id_message_id_pk" PRIMARY KEY("chat_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" ADD COLUMN "query_type" varchar(20) DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" ADD COLUMN "chat_id" varchar(256);--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_chat" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_chat_user_id_pdr_ai_v2_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pdr_ai_v2_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_document" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_document_user_id_pdr_ai_v2_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pdr_ai_v2_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_message" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_message_chat_id_pdr_ai_v2_ai_chatbot_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."pdr_ai_v2_ai_chatbot_chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_suggestion" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_suggestion_user_id_pdr_ai_v2_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pdr_ai_v2_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_suggestion" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_suggestion_document_id_document_created_at_pdr_ai_v2_ai_chatbot_document_id_created_at_fk" FOREIGN KEY ("document_id","document_created_at") REFERENCES "public"."pdr_ai_v2_ai_chatbot_document"("id","created_at") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_vote" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_vote_chat_id_pdr_ai_v2_ai_chatbot_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."pdr_ai_v2_ai_chatbot_chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_vote" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_vote_message_id_pdr_ai_v2_ai_chatbot_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."pdr_ai_v2_ai_chatbot_message"("id") ON DELETE cascade ON UPDATE no action;