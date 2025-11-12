ALTER TABLE "pdr_ai_v2_ai_chatbot_chat" DROP CONSTRAINT "pdr_ai_v2_ai_chatbot_chat_user_id_pdr_ai_v2_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_document" DROP CONSTRAINT "pdr_ai_v2_ai_chatbot_document_user_id_pdr_ai_v2_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_suggestion" DROP CONSTRAINT "pdr_ai_v2_ai_chatbot_suggestion_user_id_pdr_ai_v2_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" DROP COLUMN "query_type";--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_chatHistory" DROP COLUMN "chat_id";--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_users" ADD CONSTRAINT "pdr_ai_v2_users_userId_unique" UNIQUE("userId");--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_chat" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_chat_user_id_pdr_ai_v2_users_userId_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pdr_ai_v2_users"("userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_document" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_document_user_id_pdr_ai_v2_users_userId_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pdr_ai_v2_users"("userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdr_ai_v2_ai_chatbot_suggestion" ADD CONSTRAINT "pdr_ai_v2_ai_chatbot_suggestion_user_id_pdr_ai_v2_users_userId_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pdr_ai_v2_users"("userId") ON DELETE cascade ON UPDATE no action;