/**
 * Chatbot Service — Supabase persistence layer
 * Manages chat_sessions and chat_messages tables.
 */

import { supabase } from './supabase.ts';

export interface ChatSession {
  id: string;
  userId: string;
  learningPathId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const getCurrentUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
};

export const chatbotService = {
  /** Create a new chat session, optionally linked to a learning path */
  async createSession(learningPathId?: string | null, title = 'New Chat'): Promise<ChatSession> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        learning_path_id: learningPathId ?? null,
        title,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create chat session:', error);
      throw new Error(error?.message || 'Failed to create session');
    }

    return mapSession(data);
  },

  /** List all sessions for the current user, newest first */
  async listSessions(): Promise<ChatSession[]> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }

    return (data || []).map(mapSession);
  },

  /** Load all messages for a given session */
  async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load messages:', error);
      return [];
    }

    return (data || []).map(mapMessage);
  },

  /** Append a single message to a session */
  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, role, content })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to save message:', error);
      throw new Error(error?.message || 'Failed to save message');
    }

    // Bump session updated_at so it surfaces first in history
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return mapMessage(data);
  },

  /** Update the session title (e.g. derived from first user message) */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await supabase
      .from('chat_sessions')
      .update({ title: title.slice(0, 120) })
      .eq('id', sessionId);
  },

  /** Delete a session (messages cascade via FK) */
  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to delete session:', error);
      throw new Error(error.message);
    }
  },
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    learningPathId: (row.learning_path_id as string | null) ?? null,
    title: (row.title as string) || 'New Chat',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    createdAt: row.created_at as string,
  };
}
