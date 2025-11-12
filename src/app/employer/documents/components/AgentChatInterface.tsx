import React, { useState, useEffect, useRef } from 'react';
import { Brain, Send, ThumbsUp, ThumbsDown, Plus, Search, ExternalLink } from 'lucide-react';
import { useAgentChatbot } from '../hooks/useAgentChatbot';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: any;
  messageType: 'text' | 'tool_call' | 'tool_result' | 'thinking';
  createdAt: string;
}

interface AgentChatInterfaceProps {
  chatId: string;
  userId: string;
  onAIResponse?: (response: string) => void;
  selectedDocTitle?: string | null;
  searchScope: 'document' | 'company';
  selectedDocId?: number | null;
  companyId?: number | null;
  aiStyle?: string;
  aiPersona?: string;
  onPageClick?: (page: number) => void;
}

export const AgentChatInterface: React.FC<AgentChatInterfaceProps> = ({
  chatId,
  userId,
  onAIResponse,
  selectedDocTitle,
  searchScope,
  selectedDocId,
  companyId,
  aiStyle = 'concise',
  aiPersona = 'general',
  onPageClick,
}) => {
  const { getMessages, sendMessage, voteMessage, loading, error } = useAgentChatbot();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      const loadAndCheckWelcome = async () => {
        const msgs = await getMessages(chatId);
        setMessages(msgs);
        
        // Check if this is a new chat and send learning coach welcome message
        if (msgs.length === 0 && aiPersona === 'learning-coach') {
          // Send welcome message
          const welcomeMsg = await sendMessage({
            chatId,
            role: 'assistant',
            content: {
              text: `Hi! I'm your Learning Coach. 👋\n\nI'm here to help you understand and learn from your documents. I'll:\n\n• Break down complex concepts into easy-to-understand explanations\n• Ask you questions to check your understanding\n• Provide examples and analogies to make things clearer\n• Help you connect ideas across different parts of the document\n\nFeel free to ask me anything about ${selectedDocTitle || 'your documents'}! I'm here to make learning easier and more engaging for you.`
            },
            messageType: 'text',
          });
          if (welcomeMsg) {
            setMessages([welcomeMsg]);
          }
        }
      };
      loadAndCheckWelcome();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, aiPersona, selectedDocTitle]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close tools menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };

    if (showToolsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showToolsMenu]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px'; // Reset to minimum height
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 200)}px`;
    }
  }, [input]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userMessage = input.trim();
    setInput('');
    setIsSubmitting(true);

    try {
      // Send user message
      const userMsg = await sendMessage({
        chatId,
        role: 'user',
        content: { text: userMessage, context: { searchScope, selectedDocTitle } },
        messageType: 'text',
      });

      if (userMsg) {
        setMessages(prev => [...prev, userMsg]);
      }

      // Call AI service to generate response
      try {
        // Build conversation context from previous messages
        const conversationContext = messages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .slice(-6) // Last 6 messages for context (3 exchanges)
          .map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            const content = typeof msg.content === 'string' 
              ? msg.content 
              : msg.content.text || JSON.stringify(msg.content);
            return `${role}: ${content}`;
          })
          .join('\n\n');

        const requestBody: any = {
          question: userMessage,
          style: aiStyle,
          searchScope,
          conversationHistory: conversationContext || undefined, // Include conversation context
          enableWebSearch: Boolean(enableWebSearch), // Explicitly convert to boolean
          aiPersona: aiPersona, // Include AI persona for learning coach mode
        };

        // Console log web search status
        console.log('🔍 Frontend: enableWebSearch =', enableWebSearch, 'type:', typeof enableWebSearch);
        console.log('📤 Frontend: Sending requestBody with enableWebSearch:', requestBody.enableWebSearch);

        if (searchScope === "document" && selectedDocId) {
          requestBody.documentId = selectedDocId;
        } else if (searchScope === "company" && companyId) {
          requestBody.companyId = companyId;
        }

        const aiServiceResponse = await fetch("/api/AIAssistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!aiServiceResponse.ok) {
          throw new Error("Failed to get AI response");
        }

        const aiData = await aiServiceResponse.json();
        const aiAnswer = aiData.summarizedAnswer || "I'm sorry, I couldn't generate a response right now. Could you try rephrasing your question?";
        const pages = aiData.recommendedPages || [];
        const webSources = aiData.webSources || [];

        // Save AI response as a message
        const aiResponse = await sendMessage({
          chatId,
          role: 'assistant',
          content: { 
            text: aiAnswer,
            pages: pages,
            webSources: webSources.length > 0 ? webSources : undefined
          },
          messageType: 'text',
        });

        if (aiResponse) {
          setMessages(prev => [...prev, aiResponse]);
          if (onAIResponse) {
            onAIResponse(aiAnswer);
          }
        }
      } catch (err) {
        console.error('AI service error:', err);
        // Send error message
        const errorResponse = await sendMessage({
          chatId,
          role: 'assistant',
          content: { text: 'Sorry, I encountered an error. Please try again.' },
          messageType: 'text',
        });
        if (errorResponse) {
          setMessages(prev => [...prev, errorResponse]);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (messageId: string, isUpvoted: boolean) => {
    await voteMessage(chatId, messageId, isUpvoted);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages - with padding-top to account for sticky settings bar */}
      <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4" style={{ paddingTop: '140px' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="w-16 h-16 text-purple-300 dark:text-purple-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Hi there! 👋</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              I'm here to help you understand {searchScope === 'document' ? selectedDocTitle || 'your documents' : 'all your company documents'}. 
              Feel free to ask me anything!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                )}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {typeof msg.content === 'string' ? msg.content : msg.content.text || JSON.stringify(msg.content)}
                </p>
                
                {msg.role === 'assistant' && (
                  <>
                    {msg.content.pages && Array.isArray(msg.content.pages) && msg.content.pages.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-slate-600">
                        <div className="flex flex-wrap gap-1.5">
                          {msg.content.pages.map((page: number, idx: number) => (
                            <button
                              key={`${msg.id}-page-${page}-${idx}`}
                              onClick={() => onPageClick?.(page)}
                              className="inline-flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-all duration-200"
                              title={`Go to page ${page}`}
                            >
                              p{page}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.content.webSources && Array.isArray(msg.content.webSources) && msg.content.webSources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-slate-600">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Web Sources</p>
                        <div className="space-y-2">
                          {msg.content.webSources.map((source: { title: string; url: string; snippet: string }, idx: number) => (
                            <a
                              key={`${msg.id}-source-${idx}`}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                            >
                              <div className="flex items-start gap-2">
                                <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200 truncate">
                                    [Source {idx + 1}] {source.title}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                    {source.snippet}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                                    {source.url}
                                  </p>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-300 dark:border-slate-600">
                      <button
                        onClick={() => handleVote(msg.id, true)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Upvote"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVote(msg.id, false)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Downvote"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {isSubmitting && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-4">
        {error && (
          <div className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {/* Add Tools Button with Dropdown */}
          <div className="relative flex-shrink-0" ref={toolsMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowToolsMenu(!showToolsMenu);
              }}
              className={clsx(
                "h-12 w-12 flex items-center justify-center rounded-lg transition-colors border-2",
                showToolsMenu || enableWebSearch
                  ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                  : "bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              )}
              title="Add tools"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {/* Tools Dropdown Menu */}
            {showToolsMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tools</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEnableWebSearch(!enableWebSearch);
                    setShowToolsMenu(false);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors",
                    enableWebSearch && "bg-purple-50 dark:bg-purple-900/20"
                  )}
                >
                  <Search className={clsx(
                    "w-5 h-5 flex-shrink-0",
                    enableWebSearch ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      "text-sm font-medium",
                      enableWebSearch ? "text-purple-600 dark:text-purple-400" : "text-gray-900 dark:text-white"
                    )}>
                      Web Search
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Search the web for additional information
                    </p>
                  </div>
                  {enableWebSearch && (
                    <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 flex-shrink-0"></div>
                  )}
                </button>
                {/* Add more tools here in the future */}
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="flex-1 relative">
            {enableWebSearch && (
              <div className="absolute -top-6 left-0 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
                <Search className="w-3 h-3" />
                <span>Web search enabled</span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                e.stopPropagation();
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder={`Ask about ${searchScope === 'document' ? selectedDocTitle || 'documents' : 'all company documents'}...`}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 leading-relaxed resize-none min-h-[48px] max-h-[200px] overflow-hidden"
              style={{ overflow: 'hidden' }}
              rows={1}
              disabled={isSubmitting}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="h-12 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md flex items-center gap-2 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

