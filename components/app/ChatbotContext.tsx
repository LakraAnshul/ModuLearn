/**
 * ChatbotContext — React context for sharing course-level data
 * from LearningInterface (deep child) up to Chatbot (sibling via AppLayout).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CurrentCourseContext } from '../../lib/chatbotApi.ts';

interface ChatbotContextValue {
  /** Current course context set by LearningInterface */
  currentCourse: CurrentCourseContext | null;
  /** Called by LearningInterface whenever course state changes */
  setCourseContext: (ctx: CurrentCourseContext | null) => void;

  /** Signal to auto-open chatbot (e.g. when entering a new course) */
  autoOpenSignal: number;
  /** Increment to trigger auto-open */
  triggerAutoOpen: () => void;
}

const ChatbotCtx = createContext<ChatbotContextValue>({
  currentCourse: null,
  setCourseContext: () => {},
  autoOpenSignal: 0,
  triggerAutoOpen: () => {},
});

export const ChatbotContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCourse, setCurrentCourse] = useState<CurrentCourseContext | null>(null);
  const [autoOpenSignal, setAutoOpenSignal] = useState(0);

  const setCourseContext = useCallback((ctx: CurrentCourseContext | null) => {
    setCurrentCourse(ctx);
  }, []);

  const triggerAutoOpen = useCallback(() => {
    setAutoOpenSignal((n) => n + 1);
  }, []);

  return (
    <ChatbotCtx.Provider value={{ currentCourse, setCourseContext, autoOpenSignal, triggerAutoOpen }}>
      {children}
    </ChatbotCtx.Provider>
  );
};

export const useChatbotContext = () => useContext(ChatbotCtx);
