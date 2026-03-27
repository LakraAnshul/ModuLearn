/**
 * Topic-to-Timestamp Service
 * Finds video start times matching selected learning topics using:
 * 1. Video description chapter markers (00:15 Topic Name format)
 * 2. Smart LLM-based keyword matching against description
 * 3. Fallback to beginning (0:00)
 *
 * All results cached in localStorage with expiry.
 */

import { groqService } from '../backend/groqService.ts';

export interface TopicTimestampResult {
  startSeconds: number;
  confidence: 'high' | 'medium' | 'low';
  matchedText?: string;
  method: 'chapter' | 'llm-keyword' | 'fallback';
}

const CACHE_PREFIX = 'modulearn:topic_timestamps:';
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getCacheKey = (videoId: string, topic: string, moduleTitle: string): string => {
  const normalized = `${videoId}|${topic.toLowerCase().trim()}|${moduleTitle.toLowerCase().trim()}`;
  return `${CACHE_PREFIX}${normalized}`;
};

const getCachedResult = (cacheKey: string): TopicTimestampResult | null => {
  try {
    const stored = localStorage.getItem(cacheKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.result;
  } catch {
    return null;
  }
};

const setCachedResult = (cacheKey: string, result: TopicTimestampResult): void => {
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        result,
        expiresAt: Date.now() + CACHE_EXPIRY_MS,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('Failed to cache topic timestamp:', err);
  }
};

/**
 * Parse chapter timestamps from video description.
 * Looks for patterns like "00:15 Introduction" or "1:23 Main Topic"
 */
const parseChaptersFromDescription = (
  description: string,
  topic: string
): TopicTimestampResult | null => {
  if (!description || !topic) return null;

  const lines = description.split('\n');
  const topicLower = topic.toLowerCase().trim();

  for (const line of lines) {
    const trimmed = line.trim();

    // Match patterns: 00:15, 1:23, 12:34:56
    const timeMatch = trimmed.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
    if (!timeMatch) continue;

    const hours = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3], 10);
    const startSeconds = hours * 3600 + minutes * 60 + seconds;

    // Extract text after timestamp
    const afterTime = trimmed.substring(timeMatch[0].length).trim();
    const chapterTitle = afterTime.split(/[-–•:|]/)[0].trim();

    if (!chapterTitle) continue;

    // Compute match score
    const chapterLower = chapterTitle.toLowerCase();
    const topicWords = topicLower.split(/\s+/).filter((w) => w.length > 2);
    const chapterWords = chapterLower.split(/\s+/).filter((w) => w.length > 2);

    const matchCount = topicWords.filter((w) => chapterWords.some((cw) => cw.includes(w) || w.includes(cw))).length;
    const score = topicWords.length > 0 ? matchCount / topicWords.length : 0;

    if (score >= 0.6) {
      return {
        startSeconds,
        confidence: score >= 0.9 ? 'high' : 'medium',
        matchedText: chapterTitle,
        method: 'chapter',
      };
    }
  }

  return null;
};

/**
 * Use Groq LLM to extract keyword match from video description.
 * Safe fallback if description doesn't have explicit chapters.
 */
const matchTopicViaLLM = async (
  videoTitle: string,
  videoDescription: string,
  topic: string,
  moduleTitle: string,
  subtopics: string[]
): Promise<TopicTimestampResult | null> => {
  try {
    const prompt = `You are a learning content analyzer. Given a YouTube video and a learning topic, determine if the video covers this topic and provide a confidence score.

Video Title: "${videoTitle}"
Video Description (first 500 chars):
${videoDescription.substring(0, 500)}

Learning Module: "${moduleTitle}"
Topic to Find: "${topic}"
Related Subtopics: ${subtopics.slice(0, 3).join(', ')}

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "covers_topic": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "brief reason (1 sentence)"
}

If the video clearly covers the topic, respond with confidence. If unsure, use "low". If obviously unrelated, use false.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.warn('Groq LLM request failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed.covers_topic) {
      return {
        startSeconds: 0,
        confidence: 'low',
        method: 'fallback',
      };
    }

    return {
      startSeconds: 0,
      confidence: parsed.confidence || 'medium',
      matchedText: parsed.reason,
      method: 'llm-keyword',
    };
  } catch (err) {
    console.warn('LLM topic matching failed, falling back:', err);
    return null;
  }
};

/**
 * Main entry: find video start time for a selected topic.
 * Tries chapter parsing first, then LLM, then safe fallback.
 */
export const findTopicTimestamp = async ({
  videoId,
  topic,
  moduleTitle,
  subtopics,
  videoTitle,
  videoDescription,
}: {
  videoId: string;
  topic: string;
  moduleTitle: string;
  subtopics?: string[];
  videoTitle?: string;
  videoDescription?: string;
}): Promise<TopicTimestampResult> => {
  const cacheKey = getCacheKey(videoId, topic, moduleTitle);

  // Check cache first
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  // Step 1: Try parsing chapters from description
  if (videoDescription) {
    const chapterResult = parseChaptersFromDescription(videoDescription, topic);
    if (chapterResult && chapterResult.confidence === 'high') {
      setCachedResult(cacheKey, chapterResult);
      return chapterResult;
    }
  }

  // Step 2: Try LLM matching if chapter parsing didn't yield high confidence
  if (videoTitle && videoDescription && import.meta.env.VITE_GROQ_API_KEY) {
    try {
      const llmResult = await matchTopicViaLLM(
        videoTitle,
        videoDescription,
        topic,
        moduleTitle,
        subtopics || []
      );

      if (llmResult) {
        setCachedResult(cacheKey, llmResult);
        return llmResult;
      }
    } catch (err) {
      console.warn('LLM matching failed:', err);
    }
  }

  // Step 3: Safe fallback
  const fallbackResult: TopicTimestampResult = {
    startSeconds: 0,
    confidence: 'low',
    method: 'fallback',
  };

  setCachedResult(cacheKey, fallbackResult);
  return fallbackResult;
};

/**
 * Clear all cached topic timestamps (useful for testing or manual refresh).
 */
export const clearTopicTimestampCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    cacheKeys.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Failed to clear cache:', err);
  }
};

/**
 * Format seconds into readable time string (HH:MM:SS or MM:SS).
 */
export const formatSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
};
