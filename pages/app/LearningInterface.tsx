
import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Layers, 
  PlayCircle, 
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  X,
  Play,
  Code2,
  Brain,
  Trophy,
  Target,
  Star,
  RotateCcw,
  Zap,
  ChevronDown
} from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { GeneratedCurriculum, CurriculumModule, LearningPreferences } from '../../backend/groqService.ts';
import { groqService } from '../../backend/groqService.ts';
import { db, UserProfile, QuizAttemptDbRecord } from '../../lib/database.ts';
import { quizService, QuizQuestion, QuizDifficulty, QUESTION_COUNTS, ESTIMATED_MINUTES } from '../../lib/quizService.ts';
import { findTopicTimestamp, TopicTimestampResult, formatSeconds } from '../../lib/topicTimestampService.ts';
import {
  detectCodingContext,
  getPracticeLanguageOptions,
  buildCodingQuestionSetForModule,
  shouldShowCodingPractice,
  getStarterTemplate,
  CodingTestCase,
  SupportedProgrammingLanguage,
} from '../../lib/codingPractice.ts';
import {
  runCodeWithJudge0,
  runCodeAgainstTestCases,
  RunCodeResult,
  RunTestSuiteResult,
} from '../../lib/judge0Service.ts';
import BioDigitalViewerPanel from '../../components/BioDigitalViewerPanel.tsx';
import { useChatbotContext } from '../../components/app/ChatbotContext.tsx';

interface LocationState {
  curriculum: GeneratedCurriculum;
  modules: CurriculumModule[];
  topic: string;
  educationLevel: string;
  generationPreferences?: LearningPreferences;
}

interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
  language: string;
  description?: string;
  topicTimestamps?: Record<string, TopicTimestampResult>;
}

interface ModuleRunResult {
  output: string;
  status: string;
  executionTime: string | null;
  memoryKb: number | null;
  error?: string;
}

interface AttemptHistoryEntry {
  attemptedAt: string;
  language: SupportedProgrammingLanguage;
  passed: number;
  total: number;
  status: string;
  questionTitle?: string;
}

type YouTubeDuration = 'any' | 'short' | 'medium' | 'long';

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'mr', label: 'Marathi' },
];

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    defaultAudioLanguage?: string;
    defaultLanguage?: string;
    description?: string;
  };
}

const renderInlineText = (value: string) => {
  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const isListLeadIn = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized.endsWith(':')) {
    return false;
  }

  return /(include|includes|following|follow these steps|key considerations|steps|points|as follows|below)/.test(normalized);
};

const renderStructuredExplanation = (content: string) => {
  const lines = content.split('\n').map((line) => line.trimEnd());
  const elements: React.ReactNode[] = [];
  let previousBlockType: 'heading' | 'bullet-list' | 'numbered-list' | 'callout' | 'paragraph' | null = null;
  let index = 0;

  const renderCodeBlock = (languageHint: string, codeText: string, key: string) => {
    elements.push(
      <div key={key} className="my-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-950/95 dark:bg-zinc-900 overflow-hidden">
        {languageHint && (
          <div className="px-4 py-2 border-b border-zinc-700 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {languageHint}
          </div>
        )}
        <pre className="px-4 py-4 overflow-x-auto text-xs leading-relaxed text-zinc-100">
          <code>{codeText}</code>
        </pre>
      </div>
    );
  };

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const inlineFenceMatch = rawLine.match(/^(.*)```([a-zA-Z0-9_-]*)\s*([^`]+?)\s*```(.*)$/);
    if (inlineFenceMatch) {
      const prefix = inlineFenceMatch[1]?.trim();
      const languageHint = inlineFenceMatch[2]?.trim() || '';
      const codeText = inlineFenceMatch[3]?.trim() || '';
      const suffix = inlineFenceMatch[4]?.trim();

      if (prefix) {
        elements.push(
          <p key={`inline-prefix-${index}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed my-3">
            {renderInlineText(prefix)}
          </p>
        );
      }

      if (codeText) {
        renderCodeBlock(languageHint, codeText, `inline-code-${index}`);
      }

      if (suffix) {
        elements.push(
          <p key={`inline-suffix-${index}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed my-3">
            {renderInlineText(suffix)}
          </p>
        );
      }

      previousBlockType = 'paragraph';
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const languageHint = line.replace(/^```/, '').trim();
      index += 1;

      const codeLines: string[] = [];
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length && /^```/.test(lines[index].trim())) {
        index += 1;
      }

      renderCodeBlock(languageHint, codeLines.join('\n'), `code-${index}`);
      previousBlockType = 'paragraph';
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#{1,3}/)?.[0].length || 1;
      const headingText = line.replace(/^#{1,3}\s+/, '');
      const headingClass =
        level === 1
          ? 'text-xl font-extrabold text-zinc-900 dark:text-white mt-6 mb-3'
          : level === 2
            ? 'text-lg font-bold text-zinc-900 dark:text-white mt-5 mb-2'
            : 'text-base font-bold text-zinc-800 dark:text-zinc-200 mt-4 mb-2';

      elements.push(
        <h3 key={`heading-${index}`} className={headingClass}>
          {renderInlineText(headingText)}
        </h3>
      );
      previousBlockType = 'heading';
      index += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*•]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*•]\s+/, ''));
        index += 1;
      }

      let listItems = items;
      if (items.length > 1 && isListLeadIn(items[0])) {
        elements.push(
          <p key={`ul-lead-${index}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed my-3">
            {renderInlineText(items[0])}
          </p>
        );
        previousBlockType = 'paragraph';
        listItems = items.slice(1);
      }

      if (listItems.length === 0) {
        continue;
      }

      const listSpacingClass = previousBlockType === 'numbered-list' ? 'mt-6 mb-4' : 'my-4';

      elements.push(
        <ul key={`ul-${index}`} className={`list-disc pl-6 space-y-2 ${listSpacingClass} marker:text-peach`}>
          {listItems.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {renderInlineText(item)}
            </li>
          ))}
        </ul>
      );
      previousBlockType = 'bullet-list';
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      let listItems = items;
      if (items.length > 1 && isListLeadIn(items[0])) {
        elements.push(
          <p key={`ol-lead-${index}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed my-3">
            {renderInlineText(items[0])}
          </p>
        );
        previousBlockType = 'paragraph';
        listItems = items.slice(1);
      }

      if (listItems.length === 0) {
        continue;
      }

      const listSpacingClass = previousBlockType === 'bullet-list' ? 'mt-6 mb-4' : 'my-4';

      elements.push(
        <ol key={`ol-${index}`} className={`list-decimal pl-6 space-y-2 ${listSpacingClass} marker:text-peach marker:font-bold`}>
          {listItems.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {renderInlineText(item)}
            </li>
          ))}
        </ol>
      );
      previousBlockType = 'numbered-list';
      continue;
    }

    if (/^>\s+/.test(line)) {
      const callout = line.replace(/^>\s+/, '');
      elements.push(
        <div
          key={`callout-${index}`}
          className="my-4 rounded-xl border border-peach/30 bg-peach/10 px-4 py-3 text-zinc-700 dark:text-zinc-200"
        >
          {renderInlineText(callout)}
        </div>
      );
      previousBlockType = 'callout';
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,3}\s+/.test(lines[index].trim()) &&
      !/^[-*•]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !/^>\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    elements.push(
      <p key={`p-${index}`} className="text-zinc-700 dark:text-zinc-300 leading-relaxed my-3">
        {renderInlineText(paragraphLines.join(' '))}
      </p>
    );
    previousBlockType = 'paragraph';
  }

  return elements;
};

const LearningInterface: React.FC = () => {
  const [activeModule, setActiveModule] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicExplanation, setTopicExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: pathId } = useParams<{ id: string }>();
  const [curriculum, setCurriculum] = useState<GeneratedCurriculum | null>(null);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [error, setError] = useState('');
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});
  const [savedPathId, setSavedPathId] = useState<string | null>(null);
  const [selectedLanguageCodes, setSelectedLanguageCodes] = useState<string[]>(['en']);
  const [selectedVideoDuration, setSelectedVideoDuration] = useState<YouTubeDuration>('any');
  const [videosByModule, setVideosByModule] = useState<Record<string, VideoItem[]>>({});
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState('');
  const [youtubeBlockedReason, setYoutubeBlockedReason] = useState('');
  const [topicTimestampLoading, setTopicTimestampLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [generationPreferences, setGenerationPreferences] = useState<LearningPreferences>({
    depth: 'structured_learning',
    familiarity: 'new_to_topic',
  });
  const [activeQuestionIndexByModule, setActiveQuestionIndexByModule] = useState<Record<string, number>>({});
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>({});
  const [stdinByQuestion, setStdinByQuestion] = useState<Record<string, string>>({});
  const [practiceLanguageByModule, setPracticeLanguageByModule] = useState<Record<string, SupportedProgrammingLanguage>>({});
  const [runLoadingByQuestion, setRunLoadingByQuestion] = useState<Record<string, boolean>>({});
  const [runResultsByQuestion, setRunResultsByQuestion] = useState<Record<string, ModuleRunResult>>({});
  const [testSuiteResultsByQuestion, setTestSuiteResultsByQuestion] = useState<Record<string, RunTestSuiteResult>>({});
  const [attemptHistoryByModule, setAttemptHistoryByModule] = useState<Record<string, AttemptHistoryEntry[]>>({});
  const [attemptsLoadedFromDb, setAttemptsLoadedFromDb] = useState<Record<string, boolean>>({});

  // ─── Quiz State ──────────────────────────────────────────────────────────
  type QuizPhase = 'idle' | 'difficulty-select' | 'generating' | 'in-quiz' | 'results' | 'review';
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle');
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('medium');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizUserAnswers, setQuizUserAnswers] = useState<number[]>([]);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [quizAttemptHistory, setQuizAttemptHistory] = useState<Record<string, QuizAttemptDbRecord[]>>({});
  const [quizHistoryLoading, setQuizHistoryLoading] = useState<Record<string, boolean>>({});
  const [quizReviewAttempt, setQuizReviewAttempt] = useState<QuizAttemptDbRecord | null>(null);
  const [quizReviewIndex, setQuizReviewIndex] = useState(0);

  const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  // ─── Chatbot context sync ────────────────────────────────────────────────
  const { setCourseContext, triggerAutoOpen } = useChatbotContext();

  // Auto-open chatbot whenever the user navigates to a new learning path
  useEffect(() => {
    if (pathId) {
      triggerAutoOpen();
    }
    // Cleanup: clear course context when leaving the page
    return () => { setCourseContext(null); };
  }, [pathId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep chatbot course context in sync with current learning state
  useEffect(() => {
    if (!curriculum || modules.length === 0) return;
    setCourseContext({
      title: curriculum.title,
      description: curriculum.description,
      modules,
      activeModuleIndex: activeModule,
      generationPreferences,
      topicExplanations: topicExplanation && selectedTopic
        ? { [selectedTopic]: topicExplanation }
        : {},
    });
  }, [curriculum, modules, activeModule, generationPreferences, topicExplanation, selectedTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDisplayLanguage = (languageCode: string): string => {
    const normalized = (languageCode || '').trim().toLowerCase();
    const map: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ar: 'Arabic',
      pt: 'Portuguese',
      bn: 'Bengali',
      ta: 'Tamil',
      te: 'Telugu',
      ko: 'Korean',
      ja: 'Japanese',
      zh: 'Chinese',
      mr: 'Marathi',
    };

    if (!normalized) return 'Unknown';
    const shortCode = normalized.split('-')[0];
    return map[normalized] || map[shortCode] || normalized.toUpperCase();
  };

  const getLanguageCode = (language: string): string => {
    const normalized = language.trim().toLowerCase();
    const map: Record<string, string> = {
      english: 'en',
      hindi: 'hi',
      spanish: 'es',
      french: 'fr',
      german: 'de',
      arabic: 'ar',
      portuguese: 'pt',
      bengali: 'bn',
      tamil: 'ta',
      telugu: 'te',
      korean: 'ko',
      japanese: 'ja',
      chinese: 'zh',
      mandarin: 'zh',
      marathi: 'mr'
    };

    if (map[normalized]) return map[normalized];
    if (normalized.length >= 2) return normalized.slice(0, 2);
    return 'en';
  };

  const getLanguageKeyword = (languageCode: string): string => {
    const shortCode = (languageCode || '').toLowerCase().split('-')[0];
    const map: Record<string, string> = {
      en: 'english',
      hi: 'hindi',
      es: 'spanish',
      fr: 'french',
      de: 'german',
      ar: 'arabic',
      pt: 'portuguese',
      bn: 'bengali',
      ta: 'tamil',
      te: 'telugu',
      ko: 'korean',
      ja: 'japanese',
      zh: 'chinese',
      mr: 'marathi',
    };

    return map[shortCode] || shortCode;
  };

  const detectLikelyLanguageFromText = (text: string): string | null => {
    if (!text) return null;

    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // CJK Unified
    if (/[\u3040-\u30FF]/.test(text)) return 'ja'; // Hiragana/Katakana
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Hangul

    return null;
  };

  const normalizeLanguageCode = (value?: string): string | null => {
    if (!value) return null;
    const cleaned = value.trim().toLowerCase();
    if (!cleaned) return null;
    return cleaned.split('-')[0];
  };

  const resolveVideoLanguage = (item: YouTubeSearchItem, requestedLanguage: string): string => {
    const metadataLanguage = normalizeLanguageCode(item.snippet?.defaultAudioLanguage || item.snippet?.defaultLanguage);
    const likelyFromText = detectLikelyLanguageFromText(`${item.snippet?.title || ''} ${item.snippet?.description || ''}`);
    const requested = normalizeLanguageCode(requestedLanguage) || 'en';

    // Strong textual signals should override metadata when they disagree.
    if (likelyFromText && likelyFromText !== metadataLanguage) {
      return likelyFromText;
    }

    if (metadataLanguage === requested || likelyFromText === requested) {
      return requested;
    }

    return metadataLanguage || likelyFromText || requested;
  };

  const hasLanguageKeyword = (text: string, languageCode: string): boolean => {
    const value = (text || '').toLowerCase();
    const shortCode = normalizeLanguageCode(languageCode) || 'en';
    const keywordMap: Record<string, string[]> = {
      hi: ['hindi', 'hind', 'हिंदी', 'हिन्दी'],
      en: ['english'],
      es: ['spanish', 'espanol', 'español'],
      fr: ['french', 'francais', 'français'],
      de: ['german', 'deutsch'],
      ar: ['arabic', 'عربي'],
      ta: ['tamil'],
      te: ['telugu'],
      bn: ['bengali', 'bangla'],
      ja: ['japanese', 'nihongo'],
      ko: ['korean'],
      zh: ['chinese', 'mandarin'],
    };

    const hints = keywordMap[shortCode] || [getLanguageKeyword(shortCode)];
    return hints.some((hint) => value.includes(hint));
  };

  const scoreLanguageMatch = (item: YouTubeSearchItem, requestedLanguage: string): number => {
    const requested = normalizeLanguageCode(requestedLanguage) || 'en';
    const metadata = normalizeLanguageCode(item.snippet?.defaultAudioLanguage || item.snippet?.defaultLanguage);
    const text = `${item.snippet?.title || ''} ${item.snippet?.description || ''}`;
    const detected = detectLikelyLanguageFromText(text);
    const textLower = text.toLowerCase();

    let score = 0;

    if (metadata === requested) score += 4;
    if (detected === requested) score += 5;
    if (hasLanguageKeyword(textLower, requested)) score += 3;

    // Penalize obvious Hindi indicators when targeting English.
    if (
      requested === 'en' &&
      (/[\u0900-\u097F]/.test(text) || hasLanguageKeyword(textLower, 'hi') || metadata === 'hi' || detected === 'hi')
    ) {
      score -= 8;
    }

    if (metadata && metadata !== requested) score -= 2;
    if (detected && detected !== requested) score -= 2;

    return score;
  };

  const buildVideoCacheKey = (
    moduleId: string,
    languageCodes: string[],
    duration: YouTubeDuration,
  ): string => {
    return `${moduleId}__${languageCodes.join('_')}__${duration}`;
  };

  const toggleLanguageSelection = (languageCode: string) => {
    setSelectedLanguageCodes((prev) => {
      const normalized = normalizeLanguageCode(languageCode) || 'en';
      if (prev.includes(normalized)) {
        const remaining = prev.filter((code) => code !== normalized);
        return remaining.length ? remaining : ['en'];
      }

      const next = [...prev, normalized];
      return next.slice(-2);
    });
  };

  useEffect(() => {
    const loadLearningPath = async () => {
      const state = location.state as LocationState | undefined;
      if (state?.curriculum) {
        setCurriculum(state.curriculum);
        setModules(state.modules || []);
        if (state.generationPreferences) {
          setGenerationPreferences(state.generationPreferences);
        }
        if (pathId) {
          setSavedPathId(pathId);
          await db.touchLearningPath(pathId);
        }
        return;
      }

      if (!pathId) {
        setError('No curriculum data. Please generate a new learning path.');
        return;
      }

      try {
        const savedPath = await db.getLearningPathById(pathId);
        if (!savedPath) {
          setError('Learning path not found. Please create a new one.');
          return;
        }

        setSavedPathId(savedPath.id);
        setCurriculum({
          title: savedPath.title,
          description: savedPath.description,
          totalEstimatedHours: savedPath.totalEstimatedHours,
          educationLevel: savedPath.educationLevel,
          modules: savedPath.modules,
        });
        setModules(savedPath.modules || []);
        setGenerationPreferences(savedPath.generationPreferences);
        setActiveModule(Math.max(0, Math.min(savedPath.currentModuleIndex || 0, (savedPath.modules?.length || 1) - 1)));

        const completedMap = (savedPath.completedModuleIds || []).reduce<Record<string, boolean>>((acc, moduleId) => {
          acc[moduleId] = true;
          return acc;
        }, {});
        setCompletedModules(completedMap);
        await db.touchLearningPath(savedPath.id);
      } catch (err) {
        console.error('Failed to load saved learning path:', err);
        setError('Unable to load saved learning path. Please try again.');
      }
    };

    loadLearningPath();
  }, [location, pathId]);

  useEffect(() => {
    const persistProgress = async () => {
      if (!savedPathId || modules.length === 0) {
        return;
      }

      const completedIds = Object.entries(completedModules)
        .filter(([, isDone]) => isDone)
        .map(([moduleId]) => moduleId);
      const progressPercent = Math.round((completedIds.length / modules.length) * 100);

      try {
        await db.updateLearningPathProgress(savedPathId, {
          completedModuleIds: completedIds,
          currentModuleIndex: activeModule,
          progressPercent,
        });
      } catch (err) {
        console.warn('Failed to persist progress update:', err);
      }
    };

    const timer = setTimeout(() => {
      persistProgress();
    }, 350);

    return () => clearTimeout(timer);
  }, [savedPathId, activeModule, completedModules, modules.length]);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const profile = await db.getProfile();
        setUserProfile(profile);
        if (profile?.languages?.length) {
          const codes = profile.languages
            .map((lang) => getLanguageCode(lang))
            .filter(Boolean);
          setSelectedLanguageCodes(codes.length ? Array.from(new Set(codes)).slice(0, 2) : ['en']);
        }
      } catch (err) {
        console.warn('Failed to load preferred language:', err);
      }
    };

    loadLanguage();
  }, []);

  const handleTopicClick = async (topicName: string) => {
    if (selectedTopic === topicName) {
      // Toggle off if clicking the same topic
      setSelectedTopic(null);
      setTopicExplanation(null);
      return;
    }

    setSelectedTopic(topicName);
    setExplanationLoading(true);
    setTopicExplanation(null);

    try {
      const currentModule = modules[activeModule];
      const explanation = await groqService.explainTopic(
        topicName,
        currentModule?.title || 'Module',
        curriculum?.title || 'Topic',
        {
          educationLevel: curriculum?.educationLevel || 'college',
          preferences: generationPreferences,
          schoolClass: userProfile?.class,
          course: userProfile?.course,
          field: userProfile?.field,
          domain: userProfile?.domain,
          moduleDescription: currentModule?.description,
          moduleSubtopics: currentModule?.subtopics,
        }
      );
      setTopicExplanation(explanation);
    } catch (err) {
      console.error('Failed to get topic explanation:', err);
      setTopicExplanation('Failed to load explanation. Please try again.');
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleMarkCompleted = () => {
    if (!currentModule) return;
    setCompletedModules(prev => ({
      ...prev,
      [currentModule.id]: !prev[currentModule.id]
    }));
  };

  useEffect(() => {
    const fetchVideos = async () => {
      const currentModuleLocal = modules[activeModule];
      if (!curriculum || !currentModuleLocal) return;

      if (youtubeBlockedReason) {
        setVideosError(youtubeBlockedReason);
        return;
      }

      const baseLanguages = selectedLanguageCodes.length ? selectedLanguageCodes : ['en'];
      const targetLanguageCodes = baseLanguages.length === 1 ? [baseLanguages[0], baseLanguages[0]] : baseLanguages.slice(0, 2);
      const cacheKey = buildVideoCacheKey(currentModuleLocal.id, targetLanguageCodes, selectedVideoDuration);

      if (videosByModule[cacheKey]) return;
      if (!youtubeApiKey) {
        setVideosError('YouTube API key not configured.');
        return;
      }

      setVideosLoading(true);
      setVideosError('');

      try {
        const recommendedQueries = Array.isArray(currentModuleLocal.recommendedVideos)
          ? currentModuleLocal.recommendedVideos.slice(0, 2)
          : [];

        const queryParts = [
          curriculum.title,
          currentModuleLocal.title,
          ...recommendedQueries,
          ...(currentModuleLocal.subtopics || []).slice(0, 2)
        ];
        const baseQuery = queryParts.filter(Boolean).join(' ');

        const byLanguage: VideoItem[] = [];
        const usedVideoIds = new Set<string>();

        const fetchSearchItems = async (query: string, languageCode: string): Promise<YouTubeSearchItem[]> => {
          const durationQuery = selectedVideoDuration !== 'any' ? `&videoDuration=${selectedVideoDuration}` : '';
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&relevanceLanguage=${languageCode}&safeSearch=moderate${durationQuery}&key=${youtubeApiKey}`;
          const response = await fetch(url);
          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const reason = errorBody?.error?.errors?.[0]?.reason || errorBody?.error?.status || 'unknown';
            const message = errorBody?.error?.message || 'Failed to fetch YouTube videos';
            throw new Error(`YouTube API ${response.status}: ${reason} - ${message}`);
          }
          const data = await response.json();
          return data.items || [];
        };

        // Try to pick one candidate per selected language first.
        for (const languageCode of targetLanguageCodes) {
          const languageKeyword = getLanguageKeyword(languageCode);
          const queryWithLanguage = `${baseQuery} ${languageKeyword}`;
          let items: YouTubeSearchItem[] = await fetchSearchItems(queryWithLanguage, languageCode);

          // Fallback if language-keyword query is too narrow.
          if (!items.length) {
            items = await fetchSearchItems(baseQuery, languageCode);
          }

          if (!items.length) {
            continue;
          }

          const scoredItems = items
            .map((item) => ({ item, score: scoreLanguageMatch(item, languageCode) }))
            .sort((a, b) => b.score - a.score);

          // Always take the top-ranked candidate when available to prevent empty recommendations.
          const bestMatch = (scoredItems.find(({ item }) => {
            const id = item.id?.videoId;
            return !!id && !usedVideoIds.has(id);
          })?.item) || items.find((item) => {
            const id = item.id?.videoId;
            return !!id && !usedVideoIds.has(id);
          }) || items[0];

          if (!bestMatch?.id?.videoId || !bestMatch?.snippet?.title) {
            continue;
          }

          const videoItem: VideoItem = {
            id: bestMatch.id.videoId,
            title: bestMatch.snippet.title,
            channelTitle: bestMatch.snippet.channelTitle || '',
            thumbnail: bestMatch.snippet.thumbnails?.medium?.url || bestMatch.snippet.thumbnails?.default?.url || '',
            url: `https://www.youtube.com/watch?v=${bestMatch.id.videoId}`,
            description: bestMatch.snippet.description || '',
            language: normalizeLanguageCode(languageCode) || resolveVideoLanguage(bestMatch, languageCode),
            topicTimestamps: {},
          };
          byLanguage.push(videoItem);

          usedVideoIds.add(bestMatch.id.videoId);
        }

        // If language-specific picks are not enough, fill remaining slots from broad results.
        if (byLanguage.length < 2) {
          const broadItems = await fetchSearchItems(baseQuery, 'en');

          for (const item of broadItems) {
            const videoId = item.id?.videoId;
            const title = item.snippet?.title;
            if (!videoId || !title || usedVideoIds.has(videoId)) {
              continue;
            }

            const videoItem: VideoItem = {
              id: videoId,
              title,
              channelTitle: item.snippet?.channelTitle || '',
              thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
              url: `https://www.youtube.com/watch?v=${videoId}`,
              description: item.snippet?.description || '',
              language: resolveVideoLanguage(item, targetLanguageCodes[0] || 'en'),
              topicTimestamps: {},
            };
            byLanguage.push(videoItem);

            usedVideoIds.add(videoId);
            if (byLanguage.length >= 2) {
              break;
            }
          }
        }

        const videos = byLanguage.slice(0, 2);

        if (videos.length > 0) {
          setVideosByModule(prev => ({
            ...prev,
            [cacheKey]: videos
          }));
          setVideosError('');
        } else {
          setVideosError('Unable to find matching videos right now. Please try another module.');
        }
      } catch (err) {
        console.error('YouTube fetch failed:', err);
        const message = err instanceof Error ? err.message : 'Unable to load recommended videos right now.';

        if (/YouTube API 403/i.test(message)) {
          const keyConfigHint =
            'YouTube API access is blocked (403). Check API key validity, enable YouTube Data API v3, add correct HTTP referrer restrictions, and verify quota.';
          setVideosError(keyConfigHint);
          setYoutubeBlockedReason(keyConfigHint);
        } else if (/quota|dailyLimitExceeded|rateLimitExceeded/i.test(message)) {
          setVideosError('YouTube quota exceeded. Please try again later or use another API key.');
        } else {
          setVideosError('Unable to load recommended videos right now.');
        }
      } finally {
        setVideosLoading(false);
      }
    };

    fetchVideos();
  }, [curriculum, modules, activeModule, selectedLanguageCodes, selectedVideoDuration, videosByModule, youtubeApiKey, youtubeBlockedReason]);

  const getVideoUrlWithTopicTimestamp = async (video: VideoItem, topic: string | null): Promise<string> => {
    if (!topic || !currentModule) {
      return video.url;
    }

    // Check if already cached
    if (video.topicTimestamps?.[topic]) {
      const result = video.topicTimestamps[topic];
      if (result.startSeconds > 0) {
        return `${video.url}&t=${result.startSeconds}s`;
      }
      return video.url;
    }

    // Fetch timestamp asynchronously (non-blocking)
    setTopicTimestampLoading(true);
    try {
      const result = await findTopicTimestamp({
        videoId: video.id,
        topic,
        moduleTitle: currentModule.title,
        subtopics: currentModule.subtopics,
        videoTitle: video.title,
        videoDescription: video.description,
      });

      // Update video item with cached result
      setVideosByModule((prev) => {
        const updated = { ...prev };
        const cacheKey = currentCacheKey;
        const videos = updated[cacheKey] || [];

        return {
          ...updated,
          [cacheKey]: videos.map((v) =>
            v.id === video.id
              ? {
                  ...v,
                  topicTimestamps: {
                    ...(v.topicTimestamps || {}),
                    [topic]: result,
                  },
                }
              : v
          ),
        };
      });

      if (result.startSeconds > 0) {
        return `${video.url}&t=${result.startSeconds}s`;
      }

      return video.url;
    } catch (err) {
      console.warn('Failed to get topic timestamp:', err);
      return video.url;
    } finally {
      setTopicTimestampLoading(false);
    }
  };

  // Compute currentCacheKey outside conditional to use in function above
  const activeLanguageCodes = (selectedLanguageCodes.length ? selectedLanguageCodes : ['en']).slice(0, 2);
  const currentModule = modules[activeModule];
  const currentCacheKey = currentModule ? buildVideoCacheKey(currentModule.id, activeLanguageCodes, selectedVideoDuration) : '';
  const currentVideos = currentModule ? videosByModule[currentCacheKey] || [] : [];
  const codingContext = currentModule && curriculum
    ? detectCodingContext(curriculum.title, currentModule.title, currentModule.subtopics || [])
    : { isCodingTopic: false, lockedLanguage: null, languageCandidates: [] };
  const showCodingPractice = currentModule && curriculum
    ? shouldShowCodingPractice(curriculum.title, currentModule.title, currentModule.subtopics || [], activeModule)
    : false;
  const currentLanguageOptionList = getPracticeLanguageOptions();
  const fallbackLanguage: SupportedProgrammingLanguage = codingContext.lockedLanguage || 'python';
  const currentPracticeLanguage: SupportedProgrammingLanguage = currentModule
    ? codingContext.lockedLanguage || practiceLanguageByModule[currentModule.id] || fallbackLanguage
    : fallbackLanguage;
  const codingQuestionSet = currentModule && curriculum && showCodingPractice
    ? buildCodingQuestionSetForModule(
        curriculum.title,
        currentModule.title,
        currentModule.subtopics || [],
        currentPracticeLanguage
      )
    : null;
  const currentQuestionIndex = currentModule ? (activeQuestionIndexByModule[currentModule.id] || 0) : 0;
  const currentQuestion = codingQuestionSet
    ? codingQuestionSet.questions[Math.min(currentQuestionIndex, Math.max(0, codingQuestionSet.questions.length - 1))]
    : null;
  const currentQuestionKey = currentModule && currentQuestion ? `${currentModule.id}::${currentQuestion.id}` : null;
  const currentCode = currentQuestionKey ? (codeByQuestion[currentQuestionKey] || '') : '';
  const currentStdin = currentQuestionKey ? (stdinByQuestion[currentQuestionKey] || '') : '';
  const currentRunResult = currentQuestionKey ? runResultsByQuestion[currentQuestionKey] : undefined;
  const currentTestSuiteResult = currentQuestionKey ? testSuiteResultsByQuestion[currentQuestionKey] : undefined;
  const currentAttemptHistory = currentModule ? (attemptHistoryByModule[currentModule.id] || []) : [];
  const isCurrentRunLoading = currentQuestionKey ? !!runLoadingByQuestion[currentQuestionKey] : false;
  const publicTestCases: CodingTestCase[] = currentQuestion
    ? currentQuestion.testCases.filter((testCase) => testCase.visibility === 'public')
    : [];
  const attemptHistoryStorageKey = savedPathId
    ? `modulearn:coding_attempts:${savedPathId}`
    : curriculum
      ? `modulearn:coding_attempts:${curriculum.title}`
      : null;

  useEffect(() => {
    if (!attemptHistoryStorageKey) {
      return;
    }

    try {
      const raw = localStorage.getItem(attemptHistoryStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, AttemptHistoryEntry[]>;
      if (parsed && typeof parsed === 'object') {
        setAttemptHistoryByModule(parsed);
      }
    } catch (err) {
      console.warn('Failed to load coding attempt history:', err);
    }
  }, [attemptHistoryStorageKey]);

  useEffect(() => {
    if (!attemptHistoryStorageKey) {
      return;
    }

    try {
      localStorage.setItem(attemptHistoryStorageKey, JSON.stringify(attemptHistoryByModule));
    } catch (err) {
      console.warn('Failed to persist coding attempt history:', err);
    }
  }, [attemptHistoryStorageKey, attemptHistoryByModule]);

  useEffect(() => {
    const loadAttemptsFromDb = async () => {
      if (!savedPathId || !currentModule || !showCodingPractice) {
        return;
      }

      if (attemptsLoadedFromDb[currentModule.id]) {
        return;
      }

      try {
        const rows = await db.listCodingAttempts(savedPathId, currentModule.id, 12);
        const mapped: AttemptHistoryEntry[] = rows.map((row) => ({
          attemptedAt: row.createdAt,
          language: (row.language as SupportedProgrammingLanguage) || 'python',
          passed: row.passedCount,
          total: row.totalCount,
          status: row.status,
          questionTitle: typeof row.metadata?.questionTitle === 'string' ? row.metadata.questionTitle : undefined,
        }));

        setAttemptHistoryByModule((prev) => {
          const existing = prev[currentModule.id] || [];
          if (!existing.length) {
            return {
              ...prev,
              [currentModule.id]: mapped,
            };
          }

          // Keep existing local entries and append unique db entries.
          const seen = new Set(existing.map((entry) => `${entry.attemptedAt}-${entry.status}-${entry.passed}-${entry.total}`));
          const merged = [...existing];
          mapped.forEach((entry) => {
            const key = `${entry.attemptedAt}-${entry.status}-${entry.passed}-${entry.total}`;
            if (!seen.has(key)) {
              merged.push(entry);
              seen.add(key);
            }
          });
          return {
            ...prev,
            [currentModule.id]: merged.slice(0, 12),
          };
        });
      } catch (err) {
        console.warn('Failed to load coding attempts from Supabase, using local history only:', err);
      } finally {
        setAttemptsLoadedFromDb((prev) => ({
          ...prev,
          [currentModule.id]: true,
        }));
      }
    };

    loadAttemptsFromDb();
  }, [savedPathId, currentModule, showCodingPractice, attemptsLoadedFromDb]);

  const pushAttemptHistory = (
    moduleId: string,
    entry: AttemptHistoryEntry,
  ) => {
    setAttemptHistoryByModule((prev) => {
      const existing = prev[moduleId] || [];
      return {
        ...prev,
        [moduleId]: [entry, ...existing].slice(0, 12),
      };
    });

    if (savedPathId) {
      db.saveCodingAttempt({
        learningPathId: savedPathId,
        moduleId,
        language: entry.language,
        passedCount: entry.passed,
        totalCount: entry.total,
        status: entry.status,
        metadata: {
          attemptedAt: entry.attemptedAt,
          questionTitle: entry.questionTitle || '',
        },
      }).catch((err) => {
        console.warn('Failed to persist coding attempt to Supabase:', err);
      });
    }
  };

  useEffect(() => {
    if (!currentModule || !showCodingPractice) {
      return;
    }

    if (codingContext.lockedLanguage) {
      setPracticeLanguageByModule((prev) => {
        if (prev[currentModule.id] === codingContext.lockedLanguage) {
          return prev;
        }

        return {
          ...prev,
          [currentModule.id]: codingContext.lockedLanguage,
        };
      });
    }
  }, [currentModule, showCodingPractice, codingContext.lockedLanguage]);

  useEffect(() => {
    if (!currentModule || !showCodingPractice || !codingQuestionSet || !currentQuestion) {
      return;
    }

    const questionKey = `${currentModule.id}::${currentQuestion.id}`;
    setCodeByQuestion((prev) => {
      if (prev[questionKey]?.trim()) {
        return prev;
      }

      return {
        ...prev,
        [questionKey]: codingQuestionSet.starterCode || getStarterTemplate(currentPracticeLanguage),
      };
    });
  }, [currentModule, showCodingPractice, codingQuestionSet, currentQuestion, currentPracticeLanguage]);

  const handlePracticeLanguageChange = (nextLanguage: SupportedProgrammingLanguage) => {
    if (!currentModule || codingContext.lockedLanguage) {
      return;
    }

    setPracticeLanguageByModule((prev) => ({
      ...prev,
      [currentModule.id]: nextLanguage,
    }));

    if (!currentQuestion) {
      return;
    }

    const questionKey = `${currentModule.id}::${currentQuestion.id}`;
    setCodeByQuestion((prev) => {
      if (prev[questionKey]?.trim()) {
        return prev;
      }
      return {
        ...prev,
        [questionKey]: getStarterTemplate(nextLanguage),
      };
    });
  };

  const handleNextQuestion = () => {
    if (!currentModule || !codingQuestionSet) {
      return;
    }

    setActiveQuestionIndexByModule((prev) => {
      const currentIndex = prev[currentModule.id] || 0;
      const maxIndex = Math.max(0, codingQuestionSet.questions.length - 1);
      return {
        ...prev,
        [currentModule.id]: Math.min(currentIndex + 1, maxIndex),
      };
    });
  };

  const handlePreviousQuestion = () => {
    if (!currentModule) {
      return;
    }

    setActiveQuestionIndexByModule((prev) => {
      const currentIndex = prev[currentModule.id] || 0;
      return {
        ...prev,
        [currentModule.id]: Math.max(0, currentIndex - 1),
      };
    });
  };

  const handleRunCode = async () => {
    if (!currentModule || !showCodingPractice || !currentQuestion || !currentQuestionKey) {
      return;
    }

    const sourceCode = codeByQuestion[currentQuestionKey] || '';
    if (!sourceCode.trim()) {
      setRunResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: {
          output: 'Please write some code before running.',
          status: 'Validation Error',
          executionTime: null,
          memoryKb: null,
          error: 'Empty source code',
        },
      }));
      return;
    }

    const language = codingContext.lockedLanguage || practiceLanguageByModule[currentModule.id] || 'python';

    setRunLoadingByQuestion((prev) => ({
      ...prev,
      [currentQuestionKey]: true,
    }));

    try {
      const result: RunCodeResult = await runCodeWithJudge0(
        sourceCode,
        language,
        stdinByQuestion[currentQuestionKey] || ''
      );

      setRunResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: {
          output: result.output,
          status: result.status,
          executionTime: result.executionTime,
          memoryKb: result.memoryKb,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run code.';
      setRunResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: {
          output: message,
          status: 'Execution Error',
          executionTime: null,
          memoryKb: null,
          error: message,
        },
      }));
    } finally {
      setRunLoadingByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: false,
      }));
    }
  };

  const handleRunTests = async () => {
    if (!currentModule || !showCodingPractice || !currentQuestion || !currentQuestionKey) {
      return;
    }

    const sourceCode = codeByQuestion[currentQuestionKey] || '';
    if (!sourceCode.trim()) {
      setRunResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: {
          output: 'Please write some code before running test cases.',
          status: 'Validation Error',
          executionTime: null,
          memoryKb: null,
          error: 'Empty source code',
        },
      }));
      return;
    }

    const language = codingContext.lockedLanguage || practiceLanguageByModule[currentModule.id] || 'python';

    setRunLoadingByQuestion((prev) => ({
      ...prev,
      [currentQuestionKey]: true,
    }));

    try {
      const suiteResult = await runCodeAgainstTestCases(sourceCode, language, currentQuestion.testCases);
      setTestSuiteResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: suiteResult,
      }));

      const overallStatus = suiteResult.failed === 0 ? 'All tests passed' : `${suiteResult.failed} test(s) failed`;
      setRunResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: {
          output: `${suiteResult.passed}/${suiteResult.total} test cases passed.`,
          status: overallStatus,
          executionTime: null,
          memoryKb: null,
        },
      }));

      pushAttemptHistory(currentModule.id, {
        attemptedAt: new Date().toISOString(),
        language,
        passed: suiteResult.passed,
        total: suiteResult.total,
        status: overallStatus,
        questionTitle: currentQuestion.title,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run test cases.';
      setRunResultsByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: {
          output: message,
          status: 'Execution Error',
          executionTime: null,
          memoryKb: null,
          error: message,
        },
      }));
    } finally {
      setRunLoadingByQuestion((prev) => ({
        ...prev,
        [currentQuestionKey]: false,
      }));
    }
  };

  useEffect(() => {
    if (!selectedTopic || !currentModule || currentVideos.length === 0) {
      return;
    }

    const videosToResolve = currentVideos.filter((video) => !video.topicTimestamps?.[selectedTopic]);
    if (videosToResolve.length === 0) {
      return;
    }

    let isCancelled = false;

    const preloadTopicTimestamps = async () => {
      setTopicTimestampLoading(true);
      try {
        const resolved = await Promise.all(
          videosToResolve.map(async (video) => {
            try {
              const result = await findTopicTimestamp({
                videoId: video.id,
                topic: selectedTopic,
                moduleTitle: currentModule.title,
                subtopics: currentModule.subtopics,
                videoTitle: video.title,
                videoDescription: video.description,
              });
              return { videoId: video.id, result };
            } catch (err) {
              console.warn('Failed to preload topic timestamp:', err);
              return {
                videoId: video.id,
                result: {
                  startSeconds: 0,
                  confidence: 'low' as const,
                  method: 'fallback' as const,
                },
              };
            }
          })
        );

        if (isCancelled) {
          return;
        }

        const resultMap = new Map(resolved.map((entry) => [entry.videoId, entry.result]));
        setVideosByModule((prev) => {
          const videos = prev[currentCacheKey] || [];
          return {
            ...prev,
            [currentCacheKey]: videos.map((video) => {
              const matchedResult = resultMap.get(video.id);
              if (!matchedResult) {
                return video;
              }

              return {
                ...video,
                topicTimestamps: {
                  ...(video.topicTimestamps || {}),
                  [selectedTopic]: matchedResult,
                },
              };
            }),
          };
        });
      } finally {
        if (!isCancelled) {
          setTopicTimestampLoading(false);
        }
      }
    };

    preloadTopicTimestamps();

    return () => {
      isCancelled = true;
    };
  }, [selectedTopic, currentCacheKey, currentModule, currentVideos]);

  // ─── Quiz Handlers ────────────────────────────────────────────────────────

  const handleOpenQuizDifficultySelect = useCallback(() => {
    setQuizPhase('difficulty-select');
    setQuizError('');
  }, []);

  const handleStartQuiz = useCallback(async () => {
    if (!currentModule || !curriculum) return;
    setQuizPhase('generating');
    setQuizGenerating(true);
    setQuizError('');
    setQuizQuestions([]);
    setQuizCurrentIndex(0);
    setQuizSelectedOption(null);
    setQuizAnswered(false);
    setQuizUserAnswers([]);

    try {
      const questions = await quizService.generateQuestions(
        currentModule.title,
        currentModule.subtopics || [],
        curriculum.title,
        quizDifficulty,
      );
      setQuizQuestions(questions);
      setQuizPhase('in-quiz');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate quiz.';
      setQuizError(msg);
      setQuizPhase('difficulty-select');
    } finally {
      setQuizGenerating(false);
    }
  }, [currentModule, curriculum, quizDifficulty]);

  const handleSelectOption = useCallback((optionIndex: number) => {
    if (quizAnswered) return;
    setQuizSelectedOption(optionIndex);
    setQuizAnswered(true);
    setQuizUserAnswers(prev => {
      const next = [...prev];
      next[quizCurrentIndex] = optionIndex;
      return next;
    });
  }, [quizAnswered, quizCurrentIndex]);

  const handleQuizNextQuestion = useCallback(() => {
    if (quizCurrentIndex < quizQuestions.length - 1) {
      setQuizCurrentIndex(prev => prev + 1);
      setQuizSelectedOption(null);
      setQuizAnswered(false);
    } else {
      // Quiz finished — go to results
      setQuizPhase('results');
      // Persist attempt
      if (currentModule && savedPathId) {
        const score = quizUserAnswers.filter(
          (ans, i) => ans === quizQuestions[i]?.correctIndex
        ).length;
        db.saveQuizAttempt({
          learningPathId: savedPathId,
          moduleId: currentModule.id,
          difficulty: quizDifficulty,
          score,
          total: quizQuestions.length,
          questions: { questions: quizQuestions, userAnswers: quizUserAnswers },
        }).then(() => {
          // Refresh history
          if (savedPathId && currentModule) {
            db.listQuizAttempts(savedPathId, currentModule.id, 5).then(records => {
              setQuizAttemptHistory(prev => ({
                ...prev,
                [currentModule.id]: records,
              }));
            }).catch(() => {/* silent */});
          }
        }).catch(err => console.warn('Failed to save quiz attempt:', err));
      }
    }
  }, [quizCurrentIndex, quizQuestions, quizUserAnswers, currentModule, savedPathId, quizDifficulty]);

  const handleRetakeQuiz = useCallback(() => {
    setQuizPhase('difficulty-select');
    setQuizError('');
  }, []);

  const handleCloseQuiz = useCallback(() => {
    setQuizPhase('idle');
    setQuizError('');
  }, []);

  const handleOpenReview = useCallback((attempt: QuizAttemptDbRecord) => {
    setQuizReviewAttempt(attempt);
    setQuizReviewIndex(0);
    setQuizPhase('review');
  }, []);

  const handleCloseReview = useCallback(() => {
    setQuizReviewAttempt(null);
    setQuizPhase('idle');
  }, []);

  // Load quiz history whenever module changes
  useEffect(() => {
    if (!savedPathId || !currentModule) return;
    const moduleId = currentModule.id;
    if (quizHistoryLoading[moduleId] || quizAttemptHistory[moduleId]) return;

    setQuizHistoryLoading(prev => ({ ...prev, [moduleId]: true }));
    db.listQuizAttempts(savedPathId, moduleId, 5)
      .then(records => {
        setQuizAttemptHistory(prev => ({ ...prev, [moduleId]: records }));
      })
      .catch(() => {/* silent */})
      .finally(() => {
        setQuizHistoryLoading(prev => ({ ...prev, [moduleId]: false }));
      });
  }, [savedPathId, currentModule]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {

    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold dark:text-white mb-2">Error Loading Content</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/app')}
            className="bg-peach text-white px-6 py-3 rounded-xl font-bold hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!curriculum || modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const moduleProgress = ((activeModule + 1) / modules.length * 100).toFixed(0);
  const isCompleted = currentModule ? !!completedModules[currentModule.id] : false;
  const languageBadgeCodes: string[] = Array.from(new Set<string>(activeLanguageCodes));

  return (
    <>
    <div className="flex h-screen w-screen bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Module Sidebar - Collapsible */}
      <aside 
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col transition-[width] duration-500 ease-in-out overflow-hidden ${
          sidebarExpanded ? 'w-80' : 'w-24'
        }`}
      >
        {/* Header */}
        <div className={`border-b border-zinc-100 dark:border-zinc-800 flex items-center ${sidebarExpanded ? 'justify-between px-6 py-6' : 'justify-center px-2 py-6'}`}>
          <button 
            onClick={() => navigate('/app/library')} 
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex-shrink-0"
            title="Back to library"
          >
            <ArrowLeft size={20} />
          </button>
          {sidebarExpanded && (
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Module {String(activeModule + 1).padStart(2, '0')}/{String(modules.length).padStart(2, '0')}</span>
          )}
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {modules.map((mod, i) => (
            <button 
              key={mod.id}
              onClick={() => setActiveModule(i)}
              className={`transition-all rounded-xl border ${
                activeModule === i 
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-lg border-transparent' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              } ${sidebarExpanded ? 'p-4 w-full text-left' : 'p-4 flex items-center justify-center w-16 h-16'}`}
              title={sidebarExpanded ? '' : mod.title}
            >
              {sidebarExpanded ? (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeModule === i ? (document.documentElement.classList.contains('dark') ? 'text-zinc-500' : 'text-zinc-400') : 'text-zinc-300 dark:text-zinc-600'}`}>
                      Part {String(i + 1).padStart(2, '0')}
                    </span>
                    {completedModules[mod.id] && <CheckCircle size={14} className="text-emerald-500" />}
                  </div>
                  <h4 className="font-bold text-sm leading-tight">{mod.title}</h4>
                  <div className="flex items-center gap-2 mt-3 opacity-60">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{mod.estimatedMinutes}m</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold">{String(i + 1).padStart(2, '0')}</span>
                  {completedModules[mod.id] && <CheckCircle size={12} className="text-emerald-500" />}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950 flex flex-col">
        <div className="flex-1 p-8 lg:p-16 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2 text-peach font-bold text-xs uppercase tracking-widest mb-4">
              <BookOpen size={16} /> 
              <span>Module {String(activeModule + 1).padStart(2, '0')} of {String(modules.length).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-3 mb-4 lg:mb-8">
              <h1 className="text-3xl lg:text-5xl font-extrabold text-zinc-900 dark:text-white leading-tight">{currentModule?.title || 'Module'}</h1>
              {isCompleted && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 rounded-full">Completed</span>
              )}
            </div>
            
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mb-8">
              <div 
                className="bg-peach h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${moduleProgress}%` }}
              />
            </div>
            
            <div className="prose prose-zinc dark:prose-invert lg:prose-lg text-zinc-600 dark:text-zinc-300 space-y-6 leading-relaxed max-w-none">
              <p className="text-base">
                {currentModule?.description}
              </p>
              
              {currentModule?.subtopics && currentModule.subtopics.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Topics in this Module</h3>
                  <div className="space-y-3">
                    {currentModule.subtopics.map((topic, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleTopicClick(topic)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedTopic === topic
                            ? 'bg-peach/10 border-peach text-peach'
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:border-peach hover:bg-peach/5'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`font-bold mt-0.5 ${selectedTopic === topic ? 'text-peach' : 'text-zinc-400'}`}>•</span>
                          <div className="flex-1 text-left">
                            <span className="font-semibold">{topic}</span>
                            {selectedTopic === topic && (
                              <div className="text-xs text-peach mt-2 font-medium">Click to read explanation ↓</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showCodingPractice && currentModule && codingQuestionSet && currentQuestion && (
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800 mt-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Code2 size={20} className="text-peach" />
                        Coding Practice
                      </h3>
                      <p className="text-sm text-zinc-500 mt-2">{codingQuestionSet.title}</p>
                      <p className="text-xs text-zinc-400 mt-1">Question {currentQuestionIndex + 1} of {codingQuestionSet.questions.length}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {codingContext.lockedLanguage ? (
                        <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-peach/10 text-peach uppercase tracking-widest">
                          Locked: {codingContext.lockedLanguage}
                        </span>
                      ) : (
                        <select
                          value={currentPracticeLanguage}
                          onChange={(event) => handlePracticeLanguageChange(event.target.value as SupportedProgrammingLanguage)}
                          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                        >
                          {currentLanguageOptionList.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/30 px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{currentQuestion.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">One question per module topic. Use next to continue.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNextQuestion}
                        disabled={currentQuestionIndex >= codingQuestionSet.questions.length - 1}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="mb-5">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3">{currentQuestion.prompt}</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {currentQuestion.constraints.map((constraint, index) => (
                        <li key={index}>{constraint}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Public Test Cases</p>
                    <div className="space-y-3">
                      {publicTestCases.map((testCase) => (
                        <div key={testCase.id} className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
                          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-2">{testCase.label}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Input</p>
                              <pre className="text-xs whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-300">{testCase.input}</pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Expected Output</p>
                              <pre className="text-xs whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-300">{testCase.expectedOutput}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 mb-4">
                    <Editor
                      height="360px"
                      language={currentLanguageOptionList.find((lang) => lang.value === currentPracticeLanguage)?.monacoLanguage || 'python'}
                      value={currentCode || codingQuestionSet.starterCode}
                      theme="vs-dark"
                      onChange={(value) => {
                        if (!currentQuestionKey) {
                          return;
                        }

                        setCodeByQuestion((prev) => ({
                          ...prev,
                          [currentQuestionKey]: value || '',
                        }));
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Custom Input (stdin)</label>
                    <textarea
                      value={currentStdin}
                      onChange={(event) => {
                        if (!currentQuestionKey) {
                          return;
                        }

                        setStdinByQuestion((prev) => ({
                          ...prev,
                          [currentQuestionKey]: event.target.value,
                        }));
                      }}
                      placeholder="Optional: provide input for your program"
                      className="w-full min-h-20 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200"
                    />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunCode}
                        disabled={isCurrentRunLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-peach text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isCurrentRunLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        {isCurrentRunLoading ? 'Running...' : 'Run Code'}
                      </button>
                      <button
                        onClick={handleRunTests}
                        disabled={isCurrentRunLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isCurrentRunLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        {isCurrentRunLoading ? 'Evaluating...' : 'Run Test Cases'}
                      </button>
                    </div>
                    <span className="text-xs text-zinc-400">Execution powered by Judge0</span>
                  </div>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Output</p>
                      {currentRunResult && (
                        <div className="text-[10px] text-zinc-500 font-semibold">
                          <span className="mr-3">Status: {currentRunResult.status}</span>
                          {currentRunResult.executionTime && <span className="mr-3">Time: {currentRunResult.executionTime}s</span>}
                          {typeof currentRunResult.memoryKb === 'number' && <span>Memory: {currentRunResult.memoryKb} KB</span>}
                        </div>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-700 dark:text-zinc-200 min-h-16">
                      {currentRunResult?.output || 'Run your code to see output here.'}
                    </pre>
                  </div>

                  {currentTestSuiteResult && (
                    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Test Summary</p>
                        <span className={`text-xs font-bold ${currentTestSuiteResult.failed === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {currentTestSuiteResult.passed}/{currentTestSuiteResult.total} Passed
                        </span>
                      </div>
                      <div className="space-y-2">
                        {currentTestSuiteResult.results.map((result) => (
                          <div key={result.testCaseId} className="flex items-center justify-between text-xs border border-zinc-100 dark:border-zinc-800 rounded-lg px-3 py-2">
                            <div>
                              <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                                {result.label} {result.visibility === 'hidden' ? '(Hidden)' : '(Public)'}
                              </p>
                              <p className="text-zinc-500 mt-0.5">{result.status}</p>
                            </div>
                            <span className={`font-bold ${result.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                              {result.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Attempt History</p>
                    {currentAttemptHistory.length === 0 ? (
                      <p className="text-xs text-zinc-500">No attempts yet. Run test cases to track your progress.</p>
                    ) : (
                      <div className="space-y-2">
                        {currentAttemptHistory.map((attempt, index) => (
                          <div key={`${attempt.attemptedAt}-${index}`} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs">
                            <div>
                              {attempt.questionTitle && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{attempt.questionTitle}</p>
                              )}
                              <p className="font-semibold text-zinc-700 dark:text-zinc-200">{attempt.passed}/{attempt.total} tests passed ({attempt.language})</p>
                              <p className="text-zinc-500 mt-0.5">{new Date(attempt.attemptedAt).toLocaleString()}</p>
                            </div>
                            <span className={`font-bold ${attempt.passed === attempt.total ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {attempt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommended Videos */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Recommended Videos</h3>
                  <div className="text-right">
                    <span className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                      Langs: {languageBadgeCodes.map((code) => getDisplayLanguage(code)).join(', ')}
                    </span>
                    <span className="block text-[10px] font-semibold text-zinc-400 mt-1">
                      Length: {selectedVideoDuration === 'any' ? 'Any' : selectedVideoDuration}
                    </span>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/70 dark:bg-zinc-800/30">
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Video Length</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { value: 'any', label: 'Any' },
                          { value: 'short', label: 'Short (<4m)' },
                          { value: 'medium', label: 'Medium (4-20m)' },
                          { value: 'long', label: 'Long (>20m)' },
                        ] as { value: YouTubeDuration; label: string }[]).map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSelectedVideoDuration(option.value)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                              selectedVideoDuration === option.value
                                ? 'bg-peach text-white'
                                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-peach/60'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Languages (up to 2)</p>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGE_OPTIONS.map((option) => {
                          const isSelected = selectedLanguageCodes.includes(option.code);

                          return (
                            <button
                              key={option.code}
                              onClick={() => toggleLanguageSelection(option.code)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                                isSelected
                                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {videosLoading ? (
                  <div className="flex items-center gap-3 text-zinc-500">
                    <Loader2 className="animate-spin" size={18} />
                    <span>Finding the best videos...</span>
                  </div>
                ) : videosError ? (
                  <p className="text-sm text-zinc-500">{videosError}</p>
                ) : currentVideos.length === 0 ? (
                  <p className="text-sm text-zinc-500">No videos found yet. Try another module.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 relative">
                    {topicTimestampLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 rounded-lg pointer-events-none z-10">
                        <Loader2 className="animate-spin text-peach" size={20} />
                      </div>
                    )}
                    {currentVideos.map(video => {
                      const topicResult = selectedTopic && video.topicTimestamps?.[selectedTopic];
                      const timestampDisplay = topicResult
                        ? topicResult.startSeconds > 0
                          ? `Starts at ${formatSeconds(topicResult.startSeconds)}`
                          : 'Start from beginning'
                        : selectedTopic
                          ? 'Finding best start point...'
                          : null;

                      return (
                        <button
                          key={video.id}
                          onClick={async () => {
                            const finalUrl = await getVideoUrlWithTopicTimestamp(video, selectedTopic);
                            window.open(finalUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="group flex flex-col rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 hover:border-peach transition-colors cursor-pointer"
                        >
                          <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            {video.thumbnail && (
                              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                            )}
                          </div>
                          <div className="p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-peach mb-2">
                              {getDisplayLanguage(video.language)}
                            </p>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-2">{video.title}</h4>
                            <p className="text-xs text-zinc-500 mt-2">{video.channelTitle}</p>
                            {timestampDisplay && (
                              <p className="text-xs text-peach font-semibold mt-2.5 flex items-center gap-1">
                                <span>⏱</span> {timestampDisplay}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Topic Explanation Modal/Section */}
            {selectedTopic && (
              <div className="mt-12 p-8 bg-gradient-to-r from-peach/5 to-transparent dark:from-peach/10 rounded-2xl border-2 border-peach/20 dark:border-peach/30">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                    <BookOpen size={24} className="text-peach" />
                    {selectedTopic}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedTopic(null);
                      setTopicExplanation(null);
                    }}
                    className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  <div className="xl:col-span-3">
                    {explanationLoading ? (
                      <div className="flex items-center justify-center gap-3 py-8">
                        <Loader2 className="animate-spin text-peach" size={24} />
                        <p className="text-zinc-600 dark:text-zinc-400 font-semibold">Generating detailed explanation...</p>
                      </div>
                    ) : topicExplanation ? (
                      <div className="prose prose-zinc dark:prose-invert max-w-none">
                        <div className="space-y-1">{renderStructuredExplanation(topicExplanation)}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="xl:col-span-2">
                    <BioDigitalViewerPanel
                      topic={selectedTopic}
                      moduleTitle={currentModule?.title || ''}
                      curriculumTitle={curriculum?.title || ''}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <button 
              onClick={() => activeModule > 0 && setActiveModule(activeModule - 1)}
              disabled={activeModule === 0}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm"
            >
              <ChevronLeft size={20} /> Previous
            </button>
            <button 
              onClick={handleMarkCompleted}
              className={`px-8 lg:px-10 py-3 lg:py-4 rounded-xl font-bold transition-all text-sm lg:text-base flex items-center gap-2 ${
                isCompleted
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white hover:bg-zinc-800 dark:hover:bg-zinc-200'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle size={18} /> Completed
                </>
              ) : (
                'Mark as Completed'
              )}
            </button>
            <button 
              onClick={() => activeModule < modules.length - 1 && setActiveModule(activeModule + 1)}
              disabled={activeModule === modules.length - 1}
              className="flex items-center gap-2 text-zinc-900 dark:text-white hover:text-peach dark:hover:text-peach disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm"
            >
              Next Topic <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </main>

      {/* Tools Panel - Collapsible on smaller screens */}
      <aside className="w-96 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800 p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto hidden xl:flex max-w-[384px]">
        <div className="bg-white dark:bg-zinc-800 p-6 lg:p-8 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base lg:text-lg flex items-center gap-2 dark:text-white">
              <Layers size={18} className="text-peach" /> Flashcards
            </h3>
            <span className="bg-zinc-100 dark:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest text-zinc-400 dark:text-zinc-500">12</span>
          </div>
          <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-700 rounded-xl flex items-center justify-center p-6 text-center group cursor-pointer hover:bg-peach dark:hover:bg-peach transition-all">
            <p className="text-sm font-bold group-hover:text-white transition-colors dark:text-white">What is the primary difference between Props and State?</p>
          </div>
          <button className="w-full mt-4 text-xs font-black uppercase tracking-widest text-peach hover:underline">Practice Set</button>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-6 lg:p-8 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base lg:text-lg flex items-center gap-2 dark:text-white">
              <PlayCircle size={18} className="text-peach" /> Smart Recap
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4 group cursor-pointer">
              <div className="w-20 h-14 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-300 dark:text-zinc-600 group-hover:bg-zinc-950 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all flex-shrink-0">
                <PlayCircle size={20} />
              </div>
              <div>
                <h5 className="text-xs font-bold leading-snug group-hover:text-peach transition-colors dark:text-white">Understanding Props vs State</h5>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-widest font-bold">4.2m • YouTube</p>
              </div>
            </div>
            <div className="flex gap-4 group cursor-pointer">
              <div className="w-20 h-14 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-300 dark:text-zinc-600 group-hover:bg-zinc-950 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-950 transition-all flex-shrink-0">
                <PlayCircle size={20} />
              </div>
              <div>
                <h5 className="text-xs font-bold leading-snug group-hover:text-peach transition-colors dark:text-white">React 18 Architecture Deep Dive</h5>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-widest font-bold">12.5m • Coursera</p>
              </div>
            </div>
          </div>
        </div>

        {/* Take Module Quiz Button */}
        <button
          onClick={handleOpenQuizDifficultySelect}
          className="w-full bg-peach text-white py-4 lg:py-5 rounded-xl font-bold shadow-lg shadow-peach/20 hover:opacity-90 transition-all text-sm lg:text-base flex items-center justify-center gap-2"
        >
          <Brain size={18} />
          Take Module Quiz
        </button>

        {/* Previous Quiz Attempts */}
        {currentModule && (
          <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
            <h3 className="font-bold text-sm flex items-center gap-2 dark:text-white mb-4">
              <Target size={15} className="text-peach" /> Previous Quiz Attempts
            </h3>
            {quizHistoryLoading[currentModule.id] ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs"><Loader2 size={14} className="animate-spin" /> Loading...</div>
            ) : (quizAttemptHistory[currentModule.id] || []).length === 0 ? (
              <p className="text-xs text-zinc-400">No quiz attempts yet for this module.</p>
            ) : (
              <div className="space-y-2">
                {(quizAttemptHistory[currentModule.id] || []).map((attempt, i) => {
                  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
                  const diffColor = attempt.difficulty === 'easy' ? 'text-emerald-500' : attempt.difficulty === 'medium' ? 'text-amber-500' : 'text-red-500';
                  const diffBg = attempt.difficulty === 'easy' ? 'bg-emerald-50 dark:bg-emerald-900/20' : attempt.difficulty === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20';
                  return (
                    <div key={attempt.id || i} className="rounded-lg border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${diffBg} ${diffColor}`}>{attempt.difficulty}</span>
                        <span className={`text-xs font-bold ${pct >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{pct}%</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{attempt.score}/{attempt.total} correct</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(attempt.createdAt).toLocaleDateString()}</p>
                      {attempt.questions && attempt.questions.length > 0 && (
                        <button
                          onClick={() => handleOpenReview(attempt)}
                          className="mt-2 w-full text-[10px] font-bold uppercase tracking-widest text-peach hover:underline text-left flex items-center gap-1"
                        >
                          <BookOpen size={10} /> Review Answers
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>

    {/* ═══════════ QUIZ OVERLAY ═══════════ */}
    {quizPhase !== 'idle' && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">

        {/* ── Difficulty Select ── */}
        {(quizPhase === 'difficulty-select' || quizPhase === 'generating') && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-peach to-orange-400 p-6 text-white relative">
              <button onClick={handleCloseQuiz} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <Brain size={24} />
                <h2 className="text-xl font-extrabold">Module Quiz</h2>
              </div>
              <p className="text-white/80 text-sm">{currentModule?.title}</p>
            </div>

            <div className="p-6">
              {quizPhase === 'generating' ? (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-peach/10 flex items-center justify-center">
                    <Loader2 size={32} className="text-peach animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-zinc-900 dark:text-white">Crafting your quiz...</p>
                    <p className="text-sm text-zinc-400 mt-1">Generating {QUESTION_COUNTS[quizDifficulty]} {quizDifficulty} questions</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-5">Choose your difficulty level:</p>

                  {quizError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                      {quizError}
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {(['easy', 'medium', 'hard'] as QuizDifficulty[]).map(diff => {
                      const meta = {
                        easy: { label: 'Easy', desc: 'Basic recall & definitions', icon: Star, color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-600 dark:text-emerald-400', activeBorder: 'border-emerald-500' },
                        medium: { label: 'Medium', desc: 'Applied understanding', icon: Target, color: 'amber', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-600 dark:text-amber-400', activeBorder: 'border-amber-500' },
                        hard: { label: 'Hard', desc: 'Deep mastery & edge cases', icon: Zap, color: 'red', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', text: 'text-red-600 dark:text-red-400', activeBorder: 'border-red-500' },
                      }[diff];
                      const Icon = meta.icon;
                      const isSelected = quizDifficulty === diff;
                      return (
                        <button
                          key={diff}
                          onClick={() => setQuizDifficulty(diff)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isSelected ? `${meta.bg} ${meta.activeBorder}` : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                            <Icon size={18} className={meta.text} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold text-sm ${isSelected ? meta.text : 'text-zinc-800 dark:text-zinc-200'}`}>{meta.label}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{ESTIMATED_MINUTES[diff]}m</span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">{meta.desc} • {QUESTION_COUNTS[diff]} questions</p>
                          </div>
                          {isSelected && <CheckCircle size={18} className={meta.text} />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleCloseQuiz} className="flex-1 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleStartQuiz} className="flex-1 py-3 rounded-xl bg-peach text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                      <Brain size={16} /> Start Quiz
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── In-Quiz ── */}
        {quizPhase === 'in-quiz' && quizQuestions.length > 0 && (() => {
          const q = quizQuestions[quizCurrentIndex];
          const isCorrect = quizAnswered && quizSelectedOption === q.correctIndex;
          const progress = ((quizCurrentIndex + (quizAnswered ? 1 : 0)) / quizQuestions.length) * 100;
          const isLast = quizCurrentIndex === quizQuestions.length - 1;
          return (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
              {/* Progress header */}
              <div className="bg-gradient-to-r from-peach to-orange-400 px-6 py-4 text-white flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain size={18} />
                    <span className="font-bold text-sm">{currentModule?.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white/90">{quizCurrentIndex + 1} / {quizQuestions.length}</span>
                    <button onClick={handleCloseQuiz} className="text-white/70 hover:text-white transition-colors"><X size={18} /></button>
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {/* Question */}
                <div className="mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-peach mb-2 block">Question {quizCurrentIndex + 1}</span>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">{q.question}</p>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-5">
                  {q.options.map((option, idx) => {
                    let btnClass = 'w-full text-left p-4 rounded-xl border-2 font-semibold text-sm transition-all flex items-center gap-3 ';
                    if (!quizAnswered) {
                      btnClass += 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-peach hover:bg-peach/5 cursor-pointer';
                    } else if (idx === q.correctIndex) {
                      btnClass += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
                    } else if (idx === quizSelectedOption && idx !== q.correctIndex) {
                      btnClass += 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
                    } else {
                      btnClass += 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 cursor-default';
                    }
                    const optionLabel = ['A', 'B', 'C', 'D'][idx];
                    return (
                      <button key={idx} onClick={() => handleSelectOption(idx)} disabled={quizAnswered} className={btnClass}>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${!quizAnswered ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' : idx === q.correctIndex ? 'bg-emerald-500 text-white' : idx === quizSelectedOption ? 'bg-red-400 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                          {!quizAnswered ? optionLabel : idx === q.correctIndex ? '✓' : idx === quizSelectedOption ? '✗' : optionLabel}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {quizAnswered && (
                  <div className={`p-4 rounded-xl border-2 mb-5 ${isCorrect ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" /> : <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />}
                      <span className={`text-xs font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isCorrect ? 'Correct!' : 'Not quite'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 flex-shrink-0 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-semibold">{quizDifficulty.charAt(0).toUpperCase() + quizDifficulty.slice(1)} Difficulty</span>
                {quizAnswered && (
                  <button onClick={handleQuizNextQuestion} className="flex items-center gap-2 bg-peach text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                    {isLast ? (<><Trophy size={15} /> Finish Quiz</>) : (<>Next <ChevronRight size={15} /></>)}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Results ── */}
        {quizPhase === 'results' && (() => {
          const score = quizUserAnswers.filter((ans, i) => ans === quizQuestions[i]?.correctIndex).length;
          const total = quizQuestions.length;
          const pct = total > 0 ? Math.round((score / total) * 100) : 0;
          const grade = pct >= 90 ? { label: 'Excellent!', emoji: '🏆', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700' }
            : pct >= 70 ? { label: 'Great Job!', emoji: '⭐', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700' }
            : { label: 'Keep Practicing!', emoji: '📚', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700' };

          const circumference = 2 * Math.PI * 48;
          const strokeDashoffset = circumference - (pct / 100) * circumference;

          return (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-peach to-orange-400 px-6 py-5 text-white text-center">
                <h2 className="text-xl font-extrabold">Quiz Complete!</h2>
                <p className="text-white/80 text-sm mt-1">{currentModule?.title}</p>
              </div>

              <div className="p-6">
                {/* Score ring */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-36 h-36 mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-100 dark:text-zinc-800" />
                      <circle
                        cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className={pct >= 90 ? 'text-emerald-500' : pct >= 70 ? 'text-amber-500' : 'text-blue-500'}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">{pct}%</span>
                      <span className="text-xs text-zinc-400 font-semibold">{score}/{total}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full border ${grade.bg} ${grade.border}`}>
                    <span className={`text-sm font-black ${grade.color}`}>{grade.emoji} {grade.label}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Correct', val: score, color: 'text-emerald-500' },
                    { label: 'Wrong', val: total - score, color: 'text-red-400' },
                    { label: 'Accuracy', val: `${pct}%`, color: 'text-peach' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                      <p className={`text-xl font-extrabold ${stat.color}`}>{stat.val}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Difficulty badge */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-xs text-zinc-400">Difficulty:</span>
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${quizDifficulty === 'easy' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : quizDifficulty === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {quizDifficulty}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={handleRetakeQuiz} className="flex-1 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    <RotateCcw size={15} /> Retake
                  </button>
                  <button onClick={handleCloseQuiz} className="flex-1 py-3 rounded-xl bg-peach text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <BookOpen size={15} /> Back to Module
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {/* ── Review ── */}
        {quizPhase === 'review' && quizReviewAttempt && quizReviewAttempt.questions && (() => {
          const qs = quizReviewAttempt.questions!;
          const ua = quizReviewAttempt.userAnswers || [];
          const total = qs.length;
          const reviewScore = quizReviewAttempt.score;
          const pct = total > 0 ? Math.round((reviewScore / total) * 100) : 0;
          const q = qs[quizReviewIndex];
          const userChose = ua[quizReviewIndex];
          const isCorrect = userChose === q?.correctIndex;
          const hasChosen = typeof userChose === 'number';
          return (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
              {/* Header */}
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-700 dark:to-zinc-800 px-6 py-4 text-white flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <BookOpen size={15} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Quiz Review</p>
                      <p className="text-white/60 text-xs">{quizReviewAttempt.difficulty.charAt(0).toUpperCase() + quizReviewAttempt.difficulty.slice(1)} • {new Date(quizReviewAttempt.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-extrabold">{reviewScore}/{total}</p>
                      <p className={`text-xs font-bold ${pct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{pct}%</p>
                    </div>
                    <button onClick={handleCloseReview} className="text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                  </div>
                </div>
                {/* Progress dots */}
                <div className="flex gap-1 flex-wrap">
                  {qs.map((_, idx) => {
                    const chosen = ua[idx];
                    const correct = typeof chosen === 'number' && chosen === qs[idx]?.correctIndex;
                    const wrong = typeof chosen === 'number' && chosen !== qs[idx]?.correctIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setQuizReviewIndex(idx)}
                        className={`w-5 h-5 rounded-full text-[9px] font-black transition-all ${
                          idx === quizReviewIndex
                            ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-800 scale-110'
                            : ''
                        } ${
                          correct ? 'bg-emerald-500' : wrong ? 'bg-red-400' : 'bg-white/20'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question body */}
              <div className="overflow-y-auto flex-1 p-6">
                {q ? (
                  <>
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Question {quizReviewIndex + 1} of {total}</span>
                        {hasChosen && (
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isCorrect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          }`}>{isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
                        )}
                        {!hasChosen && (
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">Not answered</span>
                        )}
                      </div>
                      <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug">{q.question}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-5">
                      {q.options.map((option, idx) => {
                        const isThisCorrect = idx === q.correctIndex;
                        const isUserChoice = idx === userChose;
                        const isWrongChoice = isUserChoice && !isThisCorrect;

                        let cls = 'w-full text-left p-4 rounded-xl border-2 text-sm flex items-start gap-3 ';
                        if (isThisCorrect) cls += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ';
                        else if (isWrongChoice) cls += 'border-red-400 bg-red-50 dark:bg-red-900/20 ';
                        else cls += 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 ';

                        const labelCls = `w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                          isThisCorrect ? 'bg-emerald-500 text-white' :
                          isWrongChoice ? 'bg-red-400 text-white' :
                          'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                        }`;

                        return (
                          <div key={idx} className={cls}>
                            <span className={labelCls}>
                              {isThisCorrect ? '✓' : isWrongChoice ? '✗' : ['A','B','C','D'][idx]}
                            </span>
                            <div className="flex-1">
                              <span className={`font-semibold ${
                                isThisCorrect ? 'text-emerald-700 dark:text-emerald-300' :
                                isWrongChoice ? 'text-red-700 dark:text-red-300' :
                                'text-zinc-600 dark:text-zinc-400'
                              }`}>{option}</span>
                              {isThisCorrect && !isUserChoice && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">Correct answer</span>
                              )}
                              {isUserChoice && (
                                <span className={`ml-2 text-[10px] font-bold uppercase tracking-widest ${
                                  isThisCorrect ? 'text-emerald-500' : 'text-red-400'
                                }`}>Your answer</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1">
                        <BookOpen size={10} /> Explanation
                      </p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{q.explanation}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-400 text-sm">Question not found.</p>
                )}
              </div>

              {/* Footer nav */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-4 flex-shrink-0 flex items-center justify-between">
                <button
                  onClick={() => setQuizReviewIndex(prev => Math.max(0, prev - 1))}
                  disabled={quizReviewIndex === 0}
                  className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-bold text-sm disabled:opacity-40 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="text-xs font-bold text-zinc-400">{quizReviewIndex + 1} / {total}</span>
                {quizReviewIndex < total - 1 ? (
                  <button
                    onClick={() => setQuizReviewIndex(prev => Math.min(total - 1, prev + 1))}
                    className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm hover:text-peach dark:hover:text-peach transition-colors"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleCloseReview}
                    className="flex items-center gap-2 bg-peach text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    <X size={14} /> Close
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    )}
    </>
  );
};

export default LearningInterface;
