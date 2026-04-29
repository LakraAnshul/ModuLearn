import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Plus, History, Trash2, ChevronLeft, MessageSquare, Bot, Loader2 } from 'lucide-react';
import { chatbotService, ChatSession, ChatMessage } from '../../lib/chatbotService.ts';
import { streamChatCompletion, buildSystemPrompt, ChatbotContext, GrokMessage } from '../../lib/chatbotApi.ts';
import { UserProfile, SavedLearningPathSummary } from '../../lib/database.ts';
import { useChatbotContext } from './ChatbotContext.tsx';

interface Props {
  userProfile: UserProfile | null;
  learningPaths: SavedLearningPathSummary[];
}

type Panel = 'chat' | 'history';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  streaming?: boolean;
}

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

// Simple markdown renderer for chat bubbles
const renderMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${i}`} className="my-2 rounded-lg bg-zinc-950/80 border border-zinc-700 p-3 text-xs font-mono text-zinc-100 overflow-x-auto whitespace-pre-wrap">
          {lang && <div className="text-[10px] text-zinc-500 uppercase mb-1">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }
    // Heading
    if (/^#{1,3}\s/.test(line)) {
      const text = line.replace(/^#{1,3}\s/, '');
      elements.push(<p key={`h-${i}`} className="font-bold text-zinc-100 mt-2 mb-1">{renderInline(text)}</p>);
      i++; continue;
    }
    // Bullet
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-4 space-y-0.5 my-1">
          {items.map((it, j) => <li key={j} className="text-sm leading-relaxed">{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }
    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <div key={`bq-${i}`} className="border-l-2 border-peach/60 pl-3 my-1 text-zinc-300 italic text-sm">
          {renderInline(line.slice(2))}
        </div>
      );
      i++; continue;
    }
    // Empty line
    if (!line.trim()) { i++; continue; }
    // Paragraph
    elements.push(<p key={`p-${i}`} className="text-sm leading-relaxed my-0.5">{renderInline(line)}</p>);
    i++;
  }
  return elements;
};

const renderInline = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-zinc-700 px-1 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-2 mb-3">
    <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
      <Bot size={14} className="text-peach" />
    </div>
    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  </div>
);

const Chatbot: React.FC<Props> = ({ userProfile, learningPaths }) => {
  const { currentCourse, autoOpenSignal } = useChatbotContext();

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-open when entering a new course
  useEffect(() => {
    if (autoOpenSignal > 0) {
      setOpen(true);
      setPanel('chat');
    }
  }, [autoOpenSignal]);

  // Load history when panel opens
  useEffect(() => {
    if (!open) return;
    loadSessions();
  }, [open]);

  const loadSessions = async () => {
    setLoadingHistory(true);
    try {
      const data = await chatbotService.listSessions();
      setSessions(data);
      // Auto-restore last session if no active session
      if (!activeSessionId && data.length > 0) {
        await restoreSession(data[0]);
      } else if (data.length === 0) {
        await startNewSession();
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewSession = async (learningPathId?: string) => {
    try {
      const title = currentCourse ? `Chat: ${currentCourse.title}` : 'New Chat';
      const session = await chatbotService.createSession(learningPathId ?? null, title);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      setPanel('chat');
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const restoreSession = async (session: ChatSession) => {
    setActiveSessionId(session.id);
    setLoadingMessages(true);
    setPanel('chat');
    try {
      const msgs = await chatbotService.loadMessages(session.id);
      setMessages(msgs.map((m) => ({ ...m, streaming: false })));
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await chatbotService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const buildContext = (): ChatbotContext => ({
    userProfile,
    learningPaths,
    currentCourse,
  });

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');

    // Ensure we have a session
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await chatbotService.createSession(null, text.slice(0, 60));
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        sessionId = session.id;
      } catch { return; }
    }

    // Add user message to UI immediately
    const userMsg: UIMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message to DB (non-blocking)
    chatbotService.saveMessage(sessionId, 'user', text).catch(console.error);

    // Update session title from first user message
    const isFirstMessage = messages.filter((m) => m.role === 'user').length === 0;
    if (isFirstMessage) {
      chatbotService.updateSessionTitle(sessionId, text.slice(0, 80)).catch(console.error);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: text.slice(0, 80) } : s))
      );
    }

    // Build conversation history for Groq (exclude streaming placeholder)
    const history: GrokMessage[] = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text });

    // Add streaming placeholder for assistant
    const assistantMsgId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date().toISOString(), streaming: true },
    ]);
    setStreaming(true);

    abortRef.current = new AbortController();
    let finalContent = '';

    await streamChatCompletion(
      history,
      buildSystemPrompt(buildContext()),
      (token) => {
        finalContent += token;
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId ? { ...m, content: finalContent } : m)
        );
      },
      () => {
        // Stream done
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId ? { ...m, streaming: false } : m)
        );
        setStreaming(false);
        // Persist assistant message
        if (sessionId && finalContent) {
          chatbotService.saveMessage(sessionId, 'assistant', finalContent).catch(console.error);
        }
      },
      (err) => {
        const errContent = `⚠️ ${err.message}`;
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMsgId ? { ...m, content: errContent, streaming: false } : m)
        );
        setStreaming(false);
      },
      abortRef.current.signal,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  const welcomeMessage = userProfile?.fullName
    ? `Hi ${userProfile.fullName.split(' ')[0]}! 👋 I'm your AI tutor. Ask me anything about your courses, or just say hello!`
    : `Hi! 👋 I'm your AI tutor. How can I help you learn today?`;

  return (
    <>
      {/* ── Floating trigger button ────────────────────────────────────── */}
      <button
        id="chatbot-trigger-btn"
        onClick={() => { setOpen((o) => !o); setPanel('chat'); }}
        className="fixed bottom-6 right-6 z-50 w-[80px] h-[80px] rounded-full hover:scale-110 active:scale-95 transition-transform duration-200 focus:outline-none bg-transparent border-none p-0"
        title="Open AI Assistant"
        aria-label="Open AI Assistant"
      >
        {/* @ts-ignore */}
        <dotlottie-wc
          src="https://lottie.host/5f6e6f4f-7879-4807-9a72-b8389142c375/8DO7LOASky.lottie"
          style={{ width: '80px', height: '80px', pointerEvents: 'none', display: 'block' }}
          autoplay
          loop
        />
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-[88px] right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-[24px] shadow-2xl shadow-black/30 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-300 origin-bottom-right ${
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none'
        }`}
        style={{ height: '560px' }}
        role="dialog"
        aria-label="AI Assistant"
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-950 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2.5">
            {panel === 'history' ? (
              <button
                onClick={() => setPanel('chat')}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Back to chat"
              >
                <ChevronLeft size={18} />
              </button>
            ) : (
              <div className="w-7 h-7 rounded-full bg-peach/20 flex items-center justify-center">
                <Bot size={15} className="text-peach" />
              </div>
            )}
            <span className="font-bold text-white text-sm">
              {panel === 'history' ? 'Chat History' : 'AI Assistant'}
            </span>
            {currentCourse && panel === 'chat' && (
              <span className="text-[10px] font-bold text-peach bg-peach/10 border border-peach/20 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                {currentCourse.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => startNewSession()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="New Chat"
              aria-label="New Chat"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setPanel((p) => (p === 'history' ? 'chat' : 'history'))}
              className={`p-1.5 rounded-lg transition-colors ${panel === 'history' ? 'text-peach bg-peach/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              title="History"
              aria-label="Chat History"
            >
              <History size={16} />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── CHAT PANEL ────────────────────────────────────────────── */}
        {panel === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin" id="chat-messages-area">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-peach" size={24} />
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                      <div className="w-14 h-14 rounded-2xl bg-peach/10 border border-peach/20 flex items-center justify-center">
                        <MessageSquare size={24} className="text-peach" />
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{welcomeMessage}</p>
                      {currentCourse && (
                        <button
                          onClick={() => {
                            setInput(`Help me understand the current module: "${currentCourse.modules[currentCourse.activeModuleIndex]?.title}"`);
                            textareaRef.current?.focus();
                          }}
                          className="text-xs bg-peach/10 border border-peach/20 text-peach px-3 py-1.5 rounded-full hover:bg-peach/20 transition-colors font-semibold"
                        >
                          💡 Ask about current module
                        </button>
                      )}
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 mb-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-zinc-700 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                          <Bot size={14} className="text-peach" />
                        </div>
                      )}
                      <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-peach text-white rounded-br-sm'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div>{renderMarkdown(msg.content)}</div>
                          )}
                          {msg.streaming && msg.content === '' && <TypingIndicator />}
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  ))}

                  {streaming && messages[messages.length - 1]?.content === '' && (
                    <TypingIndicator />
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* ── Input area ──────────────────────────────────────── */}
            <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-3 py-2 focus-within:border-peach/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  id="chatbot-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send)"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none max-h-32 overflow-y-auto disabled:opacity-50"
                  style={{ lineHeight: '1.5' }}
                />
                <button
                  id="chatbot-send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="w-8 h-8 rounded-xl bg-peach text-white flex items-center justify-center hover:bg-peach/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  aria-label="Send message"
                >
                  {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 text-center mt-1.5">Shift+Enter for newline · Powered by Groq</p>
            </div>
          </>
        )}

        {/* ── HISTORY PANEL ─────────────────────────────────────────── */}
        {panel === 'history' && (
          <div className="flex-1 overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-peach" size={24} />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                <History size={32} className="text-zinc-400" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No conversations yet. Start chatting!</p>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => restoreSession(session)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                      activeSessionId === session.id
                        ? 'bg-peach/10 border border-peach/20'
                        : 'border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                      <MessageSquare size={14} className={activeSessionId === session.id ? 'text-peach' : 'text-zinc-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{session.title}</p>
                      <p className="text-[10px] text-zinc-400">{formatDate(session.updatedAt)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                      aria-label="Delete chat"
                      disabled={deletingId === session.id}
                    >
                      {deletingId === session.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />
                      }
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Backdrop (mobile) ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={handleClose}
        />
      )}
    </>
  );
};

export default Chatbot;
