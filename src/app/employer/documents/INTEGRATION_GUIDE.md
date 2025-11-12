# Agent AI Chatbot Integration Guide

This document explains how to integrate the new Agent AI Chatbot system with the existing AI Q&A interface.

## Overview

The integration consists of:
1. **Custom Hooks** - API interaction layer
2. **Chat Selector** - UI for managing multiple chat sessions
3. **Agent Chat Interface** - Enhanced chat UI with voting and message management
4. **Backend API** - Comprehensive REST API for chatbot operations

## Files Created

### 1. Custom Hooks
- `hooks/useAgentChatbot.ts` - React hooks for all API operations

### 2. Components
- `components/ChatSelector.tsx` - Chat management UI
- `components/AgentChatInterface.tsx` - Main chat interface

### 3. Backend API
- `/api/agent-ai-chatbot/` - Complete REST API

## Integration Steps

### Step 1: Update DocumentContent.tsx

Add state management for the new agent chatbot:

```typescript
import { useAgentChatbot } from './hooks/useAgentChatbot';
import { ChatSelector } from './components/ChatSelector';
import { AgentChatInterface } from './components/AgentChatInterface';

// Add these states
const [currentChatId, setCurrentChatId] = useState<string | null>(null);
const [chatTitle, setChatTitle] = useState('New Chat');
const { createChat } = useAgentChatbot();
```

### Step 2: Handle New Chat Creation

```typescript
const handleNewChat = async () => {
  if (!userId) return;
  
  const title = selectedDoc 
    ? `Chat about ${selectedDoc.title}` 
    : 'General AI Chat';
  
  const chat = await createChat({
    userId,
    title,
    agentMode: 'interactive',
    visibility: 'private',
  });
  
  if (chat) {
    setCurrentChatId(chat.id);
    setChatTitle(chat.title);
  }
};
```

### Step 3: Replace Chat Layout

In the `renderAiChatLayout()` function, replace the message rendering section with:

```typescript
{/* Add Chat Selector */}
<div className="mb-4">
  <ChatSelector
    userId={userId}
    currentChatId={currentChatId}
    onSelectChat={setCurrentChatId}
    onNewChat={handleNewChat}
  />
</div>

{/* Replace existing chat UI with AgentChatInterface */}
{currentChatId ? (
  <AgentChatInterface
    chatId={currentChatId}
    userId={userId}
    selectedDocTitle={selectedDoc?.title}
    searchScope={searchScope}
    onAIResponse={(response) => {
      setAiAnswer(response);
    }}
  />
) : (
  <div className="flex flex-col items-center justify-center h-full">
    <Brain className="w-16 h-16 text-purple-300 dark:text-purple-600 mb-4" />
    <p className="text-gray-500 dark:text-gray-400">Select or create a chat to get started</p>
  </div>
)}
```

### Step 4: Integrate with Existing AI Service

Update `AgentChatInterface.tsx` to call your existing AI service:

```typescript
// Replace the placeholder response with actual AI call
const aiResponse = await fetch('/api/AIAssistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: userMessage,
    style: aiStyle,
    searchScope,
    documentId: selectedDoc?.id,
    companyId,
  }),
});

const aiData = await aiResponse.json();

// Save AI response as a message
const aiMsg = await sendMessage({
  chatId,
  role: 'assistant',
  content: { 
    text: aiData.summarizedAnswer,
    pages: aiData.recommendedPages || []
  },
  messageType: 'text',
});
```

### Step 5: Add Chat History Integration

Update the left sidebar to show agent chat history:

```typescript
const { getMessages } = useAgentChatbot();

useEffect(() => {
  if (currentChatId) {
    loadChatHistory();
  }
}, [currentChatId]);

const loadChatHistory = async () => {
  const messages = await getMessages(currentChatId);
  // Convert to your existing QAHistoryEntry format if needed
  const convertedHistory = messages.map(msg => ({
    id: msg.id,
    question: msg.role === 'user' ? msg.content.text : '',
    response: msg.role === 'assistant' ? msg.content.text : '',
    documentId: selectedDoc?.id || 0,
    documentTitle: selectedDoc?.title || 'Unknown',
    pages: msg.content.pages || [],
    createdAt: msg.createdAt,
  })).filter(entry => entry.question && entry.response);
  
  setQaHistory(convertedHistory);
};
```

## Features

### Chat Management
- ✅ Create new chats
- ✅ List all chats
- ✅ Switch between chats
- ✅ Delete chats
- ✅ Update chat titles/status

### Message Features
- ✅ Send user messages
- ✅ Receive AI responses
- ✅ Vote on responses (thumbs up/down)
- ✅ Message threading
- ✅ Different message types (text, tool calls, etc.)

### Advanced Features (Ready for Implementation)
- 🔄 Task execution tracking
- 🔄 Tool call monitoring
- 🔄 Multi-step reasoning display
- 🔄 Memory persistence
- 🔄 Agent modes (autonomous, interactive, assisted)

## API Endpoints Reference

### Chats
- `GET /api/agent-ai-chatbot/chats?userId={userId}` - List chats
- `POST /api/agent-ai-chatbot/chats` - Create chat
- `GET /api/agent-ai-chatbot/chats/{chatId}` - Get chat details
- `PATCH /api/agent-ai-chatbot/chats/{chatId}` - Update chat
- `DELETE /api/agent-ai-chatbot/chats/{chatId}` - Delete chat

### Messages
- `GET /api/agent-ai-chatbot/messages?chatId={chatId}` - Get messages
- `POST /api/agent-ai-chatbot/messages` - Send message

### Voting
- `POST /api/agent-ai-chatbot/votes` - Vote on message
- `GET /api/agent-ai-chatbot/votes?chatId={chatId}&messageId={messageId}` - Get vote

See `/api/agent-ai-chatbot/README.md` for complete API documentation.

## Benefits

1. **Persistent Chat History** - Conversations are saved and can be resumed
2. **Multi-Chat Support** - Users can have multiple ongoing conversations
3. **Vote System** - Collect feedback on AI responses
4. **Extensible** - Ready for advanced features like task execution and tool calling
5. **Type-Safe** - Full TypeScript support
6. **Clean Separation** - Backend API is independent and reusable

## Migration Notes

- Existing chat history in `ChatHistory` table will continue to work
- New chats will use the agent chatbot system
- Both systems can coexist during migration
- Consider migrating old chat history to new format gradually

## Next Steps

1. ✅ Apply the integration steps above
2. Test chat creation and message sending
3. Integrate with your AI service (replace placeholder)
4. Add advanced features (tasks, tools, etc.) as needed
5. Migrate existing chat history if desired

## Troubleshooting

### Database Issues
If you get foreign key errors, ensure you've applied the fix:
```sql
-- Run the fix_foreign_keys.sql script created earlier
-- This adds the unique constraint to users.userId
```

### Messages Not Appearing
Check that:
1. ChatId is set correctly
2. Messages API is returning data
3. Message format matches expected structure

### AI Service Integration
The placeholder response needs to be replaced with your actual AI service call. Look for the TODO comment in `AgentChatInterface.tsx`.

