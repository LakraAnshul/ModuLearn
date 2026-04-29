/**
 * Chatbot API — Groq streaming + system prompt builder
 * Uses llama-3.3-70b-versatile via Groq API with SSE streaming.
 */

import { UserProfile } from './database.ts';
import { CurriculumModule, LearningPreferences } from '../backend/groqService.ts';
import { SavedLearningPathSummary } from './database.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CHATBOT_MODEL = 'llama-3.3-70b-versatile';

// ─── Context types ────────────────────────────────────────────────────────────

export interface CurrentCourseContext {
  title: string;
  description?: string;
  modules: CurriculumModule[];
  activeModuleIndex: number;
  generationPreferences: LearningPreferences;
  /** subtopic name → AI-generated explanation text (already loaded in UI) */
  topicExplanations: Record<string, string>;
}

export interface ChatbotContext {
  userProfile: UserProfile | null;
  learningPaths: SavedLearningPathSummary[];
  currentCourse: CurrentCourseContext | null;
}

// ─── System prompt builder ────────────────────────────────────────────────────

const depthLabel: Record<string, string> = {
  quick_overview: 'Quick Overview',
  structured_learning: 'Structured Learning',
  deep_mastery: 'Deep Mastery',
};
const familiarityLabel: Record<string, string> = {
  new_to_topic: 'Beginner (new to topic)',
  some_experience: 'Intermediate (some experience)',
  already_comfortable: 'Advanced (already comfortable)',
};

export function buildSystemPrompt(ctx: ChatbotContext): string {
  const { userProfile, learningPaths, currentCourse } = ctx;

  // ── User section ──────────────────────────────────────────────────────────
  const userSection = userProfile
    ? `## Learner Profile
Name: ${userProfile.fullName || 'Unknown'}
Education: ${userProfile.educationLevel === 'school' ? `School (Grade ${userProfile.class || '?'})` : userProfile.educationLevel === 'college' ? `College — ${userProfile.course || userProfile.field || 'General'}` : 'Professional'}
${userProfile.goals?.length ? `Goals: ${userProfile.goals.join(', ')}` : ''}
${userProfile.learningStyles?.length ? `Learning styles: ${userProfile.learningStyles.join(', ')}` : ''}`.trim()
    : '## Learner Profile\nNo profile loaded yet.';

  // ── Enrolled courses section ──────────────────────────────────────────────
  const coursesSection = learningPaths.length
    ? `## Enrolled Courses (${learningPaths.length} total)\n` +
      learningPaths
        .slice(0, 8)
        .map((p) => `- "${p.title}" — ${Math.round(p.progress)}% complete (${p.moduleCount} modules)`)
        .join('\n')
    : '## Enrolled Courses\nNo courses yet.';

  // ── Current course section ────────────────────────────────────────────────
  let currentCourseSection = '## Current Course\nNot currently in a course.';
  if (currentCourse) {
    const { title, description, modules, activeModuleIndex, generationPreferences, topicExplanations } = currentCourse;
    const activeModule = modules[activeModuleIndex];

    const moduleList = modules
      .map((m, i) => `  ${i === activeModuleIndex ? '→' : ' '} ${i + 1}. ${m.title} (${m.subtopics?.length || 0} subtopics)`)
      .join('\n');

    const subtopicDetail = activeModule?.subtopics?.length
      ? `Active module subtopics: ${activeModule.subtopics.join(' | ')}`
      : '';

    // Include up to 3 loaded explanations (token-efficient truncation)
    const explanationEntries = Object.entries(topicExplanations).slice(0, 3);
    const explanationsSection = explanationEntries.length
      ? '\n### Already-Explained Subtopics (summaries)\n' +
        explanationEntries
          .map(([topic, text]) => `**${topic}**: ${text.slice(0, 400).replace(/\n/g, ' ')}…`)
          .join('\n')
      : '';

    currentCourseSection = `## Current Course: "${title}"
${description ? `Overview: ${description}` : ''}
Learning depth: ${depthLabel[generationPreferences.depth] || generationPreferences.depth}
Familiarity level: ${familiarityLabel[generationPreferences.familiarity] || generationPreferences.familiarity}

### Curriculum (${modules.length} modules)
${moduleList}

### Active Module: "${activeModule?.title || 'N/A'}"
${activeModule?.description || ''}
${subtopicDetail}
${explanationsSection}`.trim();
  }

  return `You are an intelligent, encouraging AI tutor integrated inside ModuLearn — an adaptive learning platform.

${userSection}

${coursesSection}

${currentCourseSection}

## Your Behavior Rules
- Always address the learner by first name when known.
- Keep answers focused, concise, and learner-appropriate for their education level and familiarity.
- When discussing a course topic, refer to the curriculum context above.
- Use markdown formatting: **bold** for key terms, bullet lists, code blocks for code.
- If asked something outside the learner's current course, still help but note it's off-curriculum.
- Never fabricate curriculum content — stick to what is listed above.
- Be warm, encouraging, and motivating. Celebrate progress.
- If the question is ambiguous, ask one short clarifying question.
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

// ─── Streaming completion ─────────────────────────────────────────────────────

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Stream a chat completion from Groq.
 * @param messages   Full conversation history (without system prompt)
 * @param systemPrompt  The built system prompt
 * @param onToken    Called with each text chunk as it arrives
 * @param onDone     Called when the stream ends
 * @param onError    Called on error
 */
export async function streamChatCompletion(
  messages: GrokMessage[],
  systemPrompt: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  signal?: AbortSignal,
): Promise<void> {
  const apiKey = import.meta.env.VITE_GROQ_CHATBOT_API_KEY;
  if (!apiKey) {
    onError(new Error('VITE_GROQ_CHATBOT_API_KEY is not set. Check your .env file.'));
    return;
  }

  const body = {
    model: CHATBOT_MODEL,
    stream: true,
    temperature: 0.7,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  let response: Response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    onError(err instanceof Error ? err : new Error('Network error'));
    return;
  }

  if (!response.ok) {
    let msg = `Groq API error ${response.status}`;
    try {
      const errBody = await response.json();
      msg = errBody?.error?.message || msg;
    } catch {}
    onError(new Error(msg));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError(new Error('No response body'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const token = json.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
    onDone();
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    onError(err instanceof Error ? err : new Error('Stream read error'));
  } finally {
    reader.releaseLock();
  }
}
