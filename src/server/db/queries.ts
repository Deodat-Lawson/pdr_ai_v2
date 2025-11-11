import 'server-only';

import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  users,
  aiChatbotChat,
  aiChatbotDocument,
  aiChatbotSuggestion,
  aiChatbotMessage,
  aiChatbotVote,
} from './schema';

// Type definitions for AI Chatbot
type User = typeof users.$inferSelect;
type Chat = typeof aiChatbotChat.$inferSelect;
type Message = typeof aiChatbotMessage.$inferSelect;
type Vote = typeof aiChatbotVote.$inferSelect;
type Document = typeof aiChatbotDocument.$inferSelect;
type Suggestion = typeof aiChatbotSuggestion.$inferSelect;

// Block kind enum for document types
type BlockKind = 'text' | 'code' | 'image' | 'sheet';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUserByEmail(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(users).where(eq(users.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function getUserByUserId(userId: string): Promise<User | undefined> {
  try {
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    return user;
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(aiChatbotChat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(aiChatbotVote).where(eq(aiChatbotVote.chatId, id));
    await db.delete(aiChatbotMessage).where(eq(aiChatbotMessage.chatId, id));

    return await db.delete(aiChatbotChat).where(eq(aiChatbotChat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(aiChatbotChat)
      .where(eq(aiChatbotChat.userId, id))
      .orderBy(desc(aiChatbotChat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(aiChatbotChat).where(eq(aiChatbotChat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(aiChatbotMessage).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(aiChatbotMessage)
      .where(eq(aiChatbotMessage.chatId, id))
      .orderBy(asc(aiChatbotMessage.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(aiChatbotVote)
      .where(and(eq(aiChatbotVote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(aiChatbotVote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(aiChatbotVote.messageId, messageId), eq(aiChatbotVote.chatId, chatId)));
    }
    return await db.insert(aiChatbotVote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(aiChatbotVote).where(eq(aiChatbotVote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(aiChatbotDocument).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(aiChatbotDocument)
      .where(eq(aiChatbotDocument.id, id))
      .orderBy(asc(aiChatbotDocument.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(aiChatbotDocument)
      .where(eq(aiChatbotDocument.id, id))
      .orderBy(desc(aiChatbotDocument.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(aiChatbotSuggestion)
      .where(
        and(
          eq(aiChatbotSuggestion.documentId, id),
          gt(aiChatbotSuggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(aiChatbotDocument)
      .where(and(eq(aiChatbotDocument.id, id), gt(aiChatbotDocument.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(aiChatbotSuggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(aiChatbotSuggestion)
      .where(and(eq(aiChatbotSuggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(aiChatbotMessage).where(eq(aiChatbotMessage.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: aiChatbotMessage.id })
      .from(aiChatbotMessage)
      .where(
        and(eq(aiChatbotMessage.chatId, chatId), gte(aiChatbotMessage.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(aiChatbotVote)
        .where(
          and(eq(aiChatbotVote.chatId, chatId), inArray(aiChatbotVote.messageId, messageIds)),
        );

      return await db
        .delete(aiChatbotMessage)
        .where(
          and(eq(aiChatbotMessage.chatId, chatId), inArray(aiChatbotMessage.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(aiChatbotChat).set({ visibility }).where(eq(aiChatbotChat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}