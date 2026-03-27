/**
 * Topic Timestamp Diagnostic Tool
 * Validates data integrity and helps debug timestamp matching
 */

import { TopicTimestampResult } from './topicTimestampService.ts';

export interface DiagnosticReport {
  timestamp: string;
  videoId: string;
  topic: string;
  issues: string[];
  warnings: string[];
  suggestions: string[];
  cacheStatus: 'hit' | 'miss' | 'expired';
  resultSummary?: TopicTimestampResult;
}

/**
 * Validate input parameters for timestamp lookup
 */
export const validateTimestampInputs = (inputs: {
  videoId?: string;
  topic?: string;
  moduleTitle?: string;
  videoTitle?: string;
  videoDescription?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!inputs.videoId || inputs.videoId.trim().length === 0) {
    errors.push('videoId is required and must not be empty');
  } else if (!/^[a-zA-Z0-9_-]{11}$/.test(inputs.videoId)) {
    errors.push(`videoId "${inputs.videoId}" does not match YouTube ID format (11 alphanumeric chars)`);
  }

  if (!inputs.topic || inputs.topic.trim().length === 0) {
    errors.push('topic is required and must not be empty');
  } else if (inputs.topic.length > 200) {
    errors.push(`topic exceeds 200 character limit: ${inputs.topic.length} chars`);
  }

  if (!inputs.moduleTitle || inputs.moduleTitle.trim().length === 0) {
    errors.push('moduleTitle is required and must not be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate timestamp result for correctness
 */
export const validateTimestampResult = (result: TopicTimestampResult): {
  valid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  if (!result) {
    issues.push('Result is null or undefined');
    return { valid: false, issues };
  }

  if (typeof result.startSeconds !== 'number') {
    issues.push(`startSeconds is not a number: ${typeof result.startSeconds}`);
  } else if (result.startSeconds < 0) {
    issues.push(`startSeconds is negative: ${result.startSeconds}`);
  } else if (result.startSeconds > 216000) {
    // 60 hours (very long video)
    issues.push(`startSeconds seems too large (>60h): ${result.startSeconds}s`);
  }

  if (!['high', 'medium', 'low'].includes(result.confidence)) {
    issues.push(`confidence is invalid: "${result.confidence}". Must be 'high', 'medium', or 'low'`);
  }

  if (!['chapter', 'llm-keyword', 'fallback'].includes(result.method)) {
    issues.push(`method is invalid: "${result.method}". Must be 'chapter', 'llm-keyword', or 'fallback'`);
  }

  if (result.confidence === 'low' && result.startSeconds === 0 && result.method === 'fallback') {
    // This is expected behavior
  } else if (result.startSeconds > 0 && result.confidence === 'low') {
    issues.push(`Jumping to timestamp (${result.startSeconds}s) with LOW confidence - may be inaccurate`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

/**
 * Generate full diagnostic report for debugging
 */
export const generateDiagnosticReport = ({
  videoId,
  topic,
  moduleTitle,
  result,
  cacheHit,
  videoDurationSeconds,
}: {
  videoId: string;
  topic: string;
  moduleTitle: string;
  result: TopicTimestampResult;
  cacheHit: boolean;
  videoDurationSeconds?: number;
}): DiagnosticReport => {
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    videoId,
    topic,
    issues: [],
    warnings: [],
    suggestions: [],
    cacheStatus: cacheHit ? 'hit' : 'miss',
    resultSummary: result,
  };

  // Validate inputs
  const inputValidation = validateTimestampInputs({ videoId, topic, moduleTitle });
  if (!inputValidation.valid) {
    report.issues.push(...inputValidation.errors);
  }

  // Validate result
  const resultValidation = validateTimestampResult(result);
  if (!resultValidation.valid) {
    report.issues.push(...resultValidation.issues);
  }

  // Check for warnings
  if (result.confidence === 'low') {
    report.warnings.push('Low confidence match - may not be accurate');
  }

  if (videoDurationSeconds && result.startSeconds > videoDurationSeconds) {
    report.issues.push(`startSeconds (${result.startSeconds}s) exceeds video duration (${videoDurationSeconds}s)`);
  }

  if (!result.matchedText && result.method !== 'fallback') {
    report.warnings.push('No matchedText provided - reason for match is unknown');
  }

  // Generate suggestions
  if (report.issues.length > 0) {
    if (result.method === 'fallback') {
      report.suggestions.push('Consider enabling LLM matching if not already enabled');
      report.suggestions.push('Check if video has chapter markers in description (MM:SS format)');
    }
  }

  if (result.startSeconds === 0 && result.confidence !== 'low') {
    report.warnings.push('Timestamp is 0 but confidence is not low - unexpected state');
  }

  return report;
};

/**
 * Log diagnostic report to console (development only)
 */
export const logDiagnosticReport = (report: DiagnosticReport): void => {
  const style = {
    header: 'color: #2563eb; font-weight: bold; font-size: 14px;',
    success: 'color: #10b981;',
    warning: 'color: #f59e0b;',
    error: 'color: #ef4444;',
    info: 'color: #6366f1;',
  };

  console.log('%c📊 Topic Timestamp Debug Report', style.header);
  console.log(`Time: ${report.timestamp}`);
  console.log(`Video: ${report.videoId}`);
  console.log(`Topic: "${report.topic}"`);
  console.log(`Cache: ${report.cacheStatus}`);

  if (report.issues.length > 0) {
    console.log('%c❌ Issues:', style.error);
    report.issues.forEach((issue) => console.log(`  • ${issue}`));
  }

  if (report.warnings.length > 0) {
    console.log('%c⚠️ Warnings:', style.warning);
    report.warnings.forEach((warning) => console.log(`  • ${warning}`));
  }

  if (report.suggestions.length > 0) {
    console.log('%c💡 Suggestions:', style.info);
    report.suggestions.forEach((suggestion) => console.log(`  • ${suggestion}`));
  }

  if (report.resultSummary) {
    console.log('%c✅ Result:', style.success);
    console.log(`  Method: ${report.resultSummary.method}`);
    console.log(`  Confidence: ${report.resultSummary.confidence}`);
    console.log(`  Start Time: ${report.resultSummary.startSeconds}s`);
    if (report.resultSummary.matchedText) {
      console.log(`  Matched: "${report.resultSummary.matchedText}"`);
    }
  }

  console.log('%c─────────────────────────────', style.info);
};

/**
 * Check cache validity
 */
export const checkCacheValidity = (cacheKey: string): { valid: boolean; reason: string } => {
  try {
    const stored = localStorage.getItem(cacheKey);
    if (!stored) {
      return { valid: false, reason: 'Cache entry not found' };
    }

    const parsed = JSON.parse(stored);
    if (!parsed.expiresAt) {
      return { valid: false, reason: 'Cache entry missing expiresAt' };
    }

    if (Date.now() > parsed.expiresAt) {
      return { valid: false, reason: `Cache expired at ${new Date(parsed.expiresAt).toISOString()}` };
    }

    return { valid: true, reason: `Valid until ${new Date(parsed.expiresAt).toISOString()}` };
  } catch (err) {
    return { valid: false, reason: `Cache parse error: ${err}` };
  }
};

/**
 * Health check for entire timestamp feature
 */
export const runHealthCheck = (): {
  healthy: boolean;
  status: Record<string, string>;
} => {
  const status: Record<string, string> = {};

  // Check localStorage
  try {
    const testKey = 'modulearn:health_check:test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    status.localStorage = '✓ Available';
  } catch (err) {
    status.localStorage = `✗ Unavailable: ${err}`;
  }

  // Check Groq API key
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  status.groqApiKey = groqKey && groqKey.length > 10 ? '✓ Configured' : '✗ Missing or invalid';

  // Check YouTube API key
  const youtubeKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  status.youtubeApiKey = youtubeKey && youtubeKey.length > 10 ? '✓ Configured' : '✗ Missing or invalid';

  // Check cache usage
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((k) => k.startsWith('modulearn:topic_timestamps:'));
    const cacheSize = cacheKeys.reduce((sum, k) => {
      const item = localStorage.getItem(k) || '';
      return sum + item.length;
    }, 0);

    const cacheSizeMB = (cacheSize / 1024 / 1024).toFixed(2);
    status.cache = `${cacheKeys.length} entries, ~${cacheSizeMB}MB`;
  } catch (err) {
    status.cache = `Error reading cache: ${err}`;
  }

  const healthy = Object.values(status).every((s) => s.startsWith('✓'));

  return { healthy, status };
};
