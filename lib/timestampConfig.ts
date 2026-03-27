/**
 * Topic Timestamp Configuration
 * Controls behavior of topic-to-timestamp matching in video recommendations
 */

export const TIMESTAMP_CONFIG = {
  // Enable or disable topic timestamp feature globally
  enabled: true,

  // Use Groq LLM for topic matching when chapters aren't available
  // Set to false to only use chapter parsing (faster, less accurate)
  useLLMMatching: true,

  // Minimum confidence level to auto-jump to timestamp
  // 'high' - only jump for high-confidence matches (safest)
  // 'medium' - jump for medium+ confidence (balanced)
  // 'low' - jump for any non-fallback match (aggressive)
  minConfidenceToJump: 'medium' as 'high' | 'medium' | 'low',

  // Cache duration in milliseconds
  // Default: 30 days
  cacheDurationMs: 30 * 24 * 60 * 60 * 1000,

  // Show loading spinner while fetching timestamps
  showLoadingSpinner: true,

  // Automatically fetch timestamps when topic is selected
  autoFetchOnTopicSelect: true,

  // Log debug info to console
  debug: process.env.NODE_ENV === 'development',

  // Groq API settings for LLM matching
  groq: {
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 200,
  },

  // Chapter parsing patterns (regex)
  chapterPatterns: [
    /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/,  // HH:MM:SS or MM:SS format
    /^\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]/,  // [HH:MM:SS] or [MM:SS] format
  ],

  // Minimum match score for chapter titles (0-1)
  chapterMatchThreshold: 0.6,
};

export type TimestampConfigKey = keyof typeof TIMESTAMP_CONFIG;
export type PartialTimestampConfig = Partial<typeof TIMESTAMP_CONFIG>;
