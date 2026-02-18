
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
}

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
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [videosByModule, setVideosByModule] = useState<Record<string, VideoItem[]>>({});
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState('');

  const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

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
          setPreferredLanguage(getLanguageCode(profile.languages[0]));
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
      if (videosByModule[currentModuleLocal.id]) return;
      if (!youtubeApiKey) {
        setVideosError('YouTube API key not configured.');
        return;
      }

      setVideosLoading(true);
      setVideosError('');

      try {
        const queryParts = [
          curriculum.title,
          currentModuleLocal.title,
          ...(currentModuleLocal.subtopics || []).slice(0, 2)
        ];
        const query = queryParts.filter(Boolean).join(' ');
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=2&q=${encodeURIComponent(query)}&relevanceLanguage=${preferredLanguage}&safeSearch=moderate&key=${youtubeApiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch YouTube videos');
        }

        const data = await response.json();
        const videos: VideoItem[] = (data.items || []).map((item: any) => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          channelTitle: item.snippet?.channelTitle,
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          url: `https://www.youtube.com/watch?v=${item.id?.videoId}`
        })).filter((video: VideoItem) => video.id && video.title);

        setVideosByModule(prev => ({
          ...prev,
          [currentModuleLocal.id]: videos
        }));
      } catch (err) {
        console.error('YouTube fetch failed:', err);
        setVideosError('Unable to load recommended videos right now.');
      } finally {
        setVideosLoading(false);
      }
    };

    fetchVideos();
  }, [curriculum, modules, activeModule, preferredLanguage, videosByModule, youtubeApiKey]);

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
  const currentVideos = currentModule ? videosByModule[currentModule.id] || [] : [];

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
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lang: {preferredLanguage.toUpperCase()}</span>
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
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {topicExplanation}
                    </p>
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
