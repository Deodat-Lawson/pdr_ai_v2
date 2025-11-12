import { useState, useCallback } from 'react';

interface Chat {
  id: string;
  userId: string;
  title: string;
  agentMode: 'autonomous' | 'interactive' | 'assisted';
  visibility: 'public' | 'private';
  status: 'active' | 'completed' | 'paused' | 'failed';
  aiStyle?: 'concise' | 'detailed' | 'academic' | 'bullet-points';
  aiPersona?: 'general' | 'learning-coach' | 'financial-expert' | 'legal-expert' | 'math-reasoning';
  createdAt: string;
  updatedAt?: string;
}

interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: any;
  messageType: 'text' | 'tool_call' | 'tool_result' | 'thinking';
  parentMessageId?: string;
  createdAt: string;
}

interface CreateChatParams {
  userId: string;
  title: string;
  agentMode?: 'autonomous' | 'interactive' | 'assisted';
  visibility?: 'public' | 'private';
  aiStyle?: 'concise' | 'detailed' | 'academic' | 'bullet-points';
  aiPersona?: 'general' | 'learning-coach' | 'financial-expert' | 'legal-expert' | 'math-reasoning';
}

interface SendMessageParams {
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: any;
  messageType?: 'text' | 'tool_call' | 'tool_result' | 'thinking';
  parentMessageId?: string;
}

export function useAgentChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new chat
  const createChat = useCallback(async (params: CreateChatParams): Promise<Chat | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agent-ai-chatbot/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const data = await response.json();
      return data.chat;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all chats for a user
  const getChats = useCallback(async (userId: string): Promise<Chat[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent-ai-chatbot/chats?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const data = await response.json();
      return data.chats || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chats');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific chat with messages
  const getChat = useCallback(async (chatId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent-ai-chatbot/chats/${chatId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch chat');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chat');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (params: SendMessageParams): Promise<Message | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agent-ai-chatbot/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return data.message;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get messages for a chat
  const getMessages = useCallback(async (chatId: string): Promise<Message[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent-ai-chatbot/messages?chatId=${chatId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Update chat
  const updateChat = useCallback(async (chatId: string, updates: Partial<Chat>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent-ai-chatbot/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update chat');
      }

      const data = await response.json();
      return data.chat;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chat');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/agent-ai-chatbot/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Vote on a message
  const voteMessage = useCallback(async (chatId: string, messageId: string, isUpvoted: boolean, feedback?: string) => {
    try {
      const response = await fetch('/api/agent-ai-chatbot/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, messageId, isUpvoted, feedback }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      return await response.json();
    } catch (err) {
      console.error('Failed to vote:', err);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    createChat,
    getChats,
    getChat,
    sendMessage,
    getMessages,
    updateChat,
    deleteChat,
    voteMessage,
  };
}

