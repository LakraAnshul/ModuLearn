
import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GeneratedCurriculum, CurriculumModule } from '../../backend/groqService.ts';
import { groqService } from '../../backend/groqService.ts';
import { db } from '../../lib/database.ts';

interface LocationState {
  curriculum: GeneratedCurriculum;
  modules: CurriculumModule[];
  topic: string;
  educationLevel: string;
}

interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
  language: string;
}

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

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
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
  const [curriculum, setCurriculum] = useState<GeneratedCurriculum | null>(null);
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [error, setError] = useState('');
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});
  const [selectedLanguageCodes, setSelectedLanguageCodes] = useState<string[]>(['en']);
  const [videosByModule, setVideosByModule] = useState<Record<string, VideoItem[]>>({});
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState('');
  const [youtubeBlockedReason, setYoutubeBlockedReason] = useState('');

  const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

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

  const buildVideoCacheKey = (moduleId: string, languageCodes: string[]): string => {
    return `${moduleId}__${languageCodes.join('_')}`;
  };

  useEffect(() => {
    const state = location.state as LocationState;
    if (!state?.curriculum) {
      setError('No curriculum data. Please generate a new learning path.');
      return;
    }
    setCurriculum(state.curriculum);
    setModules(state.modules || []);
  }, [location]);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const profile = await db.getProfile();
        if (profile?.languages?.length) {
          const codes = profile.languages
            .map((lang) => getLanguageCode(lang))
            .filter(Boolean);
          setSelectedLanguageCodes(codes.length ? codes : ['en']);
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
        curriculum?.educationLevel || 'college'
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
      const cacheKey = buildVideoCacheKey(currentModuleLocal.id, targetLanguageCodes);

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
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&relevanceLanguage=${languageCode}&safeSearch=moderate&key=${youtubeApiKey}`;
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

          byLanguage.push({
            id: bestMatch.id.videoId,
            title: bestMatch.snippet.title,
            channelTitle: bestMatch.snippet.channelTitle || '',
            thumbnail: bestMatch.snippet.thumbnails?.medium?.url || bestMatch.snippet.thumbnails?.default?.url || '',
            url: `https://www.youtube.com/watch?v=${bestMatch.id.videoId}`,
            // Keep the label aligned with the selected language bucket.
            language: normalizeLanguageCode(languageCode) || resolveVideoLanguage(bestMatch, languageCode),
          });

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

            byLanguage.push({
              id: videoId,
              title,
              channelTitle: item.snippet?.channelTitle || '',
              thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
              url: `https://www.youtube.com/watch?v=${videoId}`,
              language: resolveVideoLanguage(item, targetLanguageCodes[0] || 'en'),
            });

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
  }, [curriculum, modules, activeModule, selectedLanguageCodes, videosByModule, youtubeApiKey, youtubeBlockedReason]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold dark:text-white mb-2">Error Loading Content</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/app/structure')}
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

  const currentModule = modules[activeModule];
  const moduleProgress = ((activeModule + 1) / modules.length * 100).toFixed(0);
  const isCompleted = currentModule ? !!completedModules[currentModule.id] : false;
  const baseLanguages = selectedLanguageCodes.length ? selectedLanguageCodes : ['en'];
  const activeLanguageCodes = baseLanguages.length === 1 ? [baseLanguages[0], baseLanguages[0]] : baseLanguages.slice(0, 2);
  const languageBadgeCodes: string[] = Array.from(new Set<string>(activeLanguageCodes));
  const currentCacheKey = currentModule ? buildVideoCacheKey(currentModule.id, activeLanguageCodes) : '';
  const currentVideos = currentModule ? videosByModule[currentCacheKey] || [] : [];

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Module Sidebar - Collapsible */}
      <aside 
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col transition-all duration-300 overflow-hidden ${
          sidebarExpanded ? 'w-80' : 'w-24'
        }`}
      >
        {/* Header */}
        <div className={`border-b border-zinc-100 dark:border-zinc-800 flex items-center ${sidebarExpanded ? 'justify-between px-6 py-6' : 'justify-center px-2 py-6'}`}>
          <button 
            onClick={() => navigate('/app/structure')} 
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex-shrink-0"
            title="Back to structure"
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

              {/* Recommended Videos */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Recommended Videos</h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Langs: {languageBadgeCodes.map((code) => getDisplayLanguage(code)).join(', ')}
                  </span>
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {currentVideos.map(video => (
                      <a
                        key={video.id}
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex flex-col rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 hover:border-peach transition-colors"
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
                        </div>
                      </a>
                    ))}
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

        <button className="w-full bg-peach text-white py-4 lg:py-5 rounded-xl font-bold shadow-lg shadow-peach/20 hover:opacity-90 transition-all text-sm lg:text-base">
          Take Module Quiz
        </button>
      </aside>
    </div>
  );
};

export default LearningInterface;
