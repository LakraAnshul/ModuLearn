
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Type, Link as LinkIcon, Sparkles, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { db, UserProfile } from '../../lib/database.ts';
import { groqService, GeneratedCurriculum, LearningDepth, LearningPreferences, TopicFamiliarity } from '../../backend/groqService.ts';
import { pdfLearningPipeline } from '../../backend/pdfLearningPipeline.ts';
import { urlLearningPipeline } from '../../backend/urlLearningPipeline.ts';

const DEPTH_OPTIONS: { value: LearningDepth; label: string; description: string }[] = [
  {
    value: 'quick_overview',
    label: 'Quick Overview',
    description: 'Learn the essentials in minutes',
  },
  {
    value: 'structured_learning',
    label: 'Structured Learning',
    description: 'Build solid understanding step-by-step',
  },
  {
    value: 'deep_mastery',
    label: 'Deep Mastery',
    description: 'In-depth, expert-level knowledge',
  },
];

const FAMILIARITY_OPTIONS: { value: TopicFamiliarity; label: string; description: string }[] = [
  {
    value: 'new_to_topic',
    label: 'New to this topic',
    description: 'Start from foundations and build confidence',
  },
  {
    value: 'some_experience',
    label: 'Some experience',
    description: 'Brief recap, then move into practical depth',
  },
  {
    value: 'already_comfortable',
    label: 'Already comfortable',
    description: 'Skip basics and focus on advanced concepts',
  },
];

const CreatePath: React.FC = () => {
  const [method, setMethod] = useState<'upload' | 'text' | 'link'>('text');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkStatus, setLinkStatus] = useState('');
  const [learningDepth, setLearningDepth] = useState<LearningDepth>('structured_learning');
  const [topicFamiliarity, setTopicFamiliarity] = useState<TopicFamiliarity>('new_to_topic');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await db.getProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Unable to load your profile. Please refresh the page.');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Map database education level to groq service format
  const getEducationLevelForGroq = (): 'school' | 'college' | 'professional' => {
    if (!profile) return 'school';
    
    if (profile.educationLevel === 'school') {
      return 'school';
    } else if (profile.educationLevel === 'college') {
      return 'college';
    } else {
      return 'professional';
    }
  };

  const handleCreate = async () => {
    if (method === 'text') {
      if (!content || content.trim().length < 5) {
        setError('Please enter a topic with at least 5 characters.');
        return;
      }
    }

    if (method === 'upload') {
      if (!selectedPdf) {
        setError('Please select a PDF file to upload.');
        return;
      }

      if (selectedPdf.size > 25 * 1024 * 1024) {
        setError('PDF file size must be 25MB or less.');
        return;
      }
    }

    if (method === 'link') {
      if (!linkUrl.trim()) {
        setError('Please enter a URL to continue.');
        return;
      }

      try {
        const normalized = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('Invalid URL protocol');
        }
      } catch {
        setError('Please enter a valid HTTP/HTTPS URL.');
        return;
      }
    }

    setError('');
    setUploadStatus('');
    setLinkStatus('');
    setLoading(true);

    const preferences: LearningPreferences = {
      depth: learningDepth,
      familiarity: topicFamiliarity,
    };

    try {
      if (!profile) {
        setError('Unable to load your profile. Please refresh and try again.');
        return;
      }

      const educationLevel = getEducationLevelForGroq();
      let curriculum: GeneratedCurriculum;
      let topicForRoute = content;
      let sourceType: 'text' | 'upload' | 'link' = method;
      let sourceInput = content;

      if (method === 'upload') {
        const file = selectedPdf as File;
        const result = await pdfLearningPipeline.processPdf(file, {
          educationLevel,
          preferences,
          onProgress: (message) => setUploadStatus(message),
        });

        curriculum = result.curriculum;
        topicForRoute = file.name.replace(/\.pdf$/i, '');
          sourceType = 'upload';
          sourceInput = file.name;

        localStorage.setItem(
          'modulearn:lastPdfPipeline',
          JSON.stringify({
            fileName: file.name,
            processedAt: new Date().toISOString(),
            totalPages: result.intermediate.totalPages,
            totalChunks: result.intermediate.totalChunks,
            chunks: result.intermediate.chunks,
            sections: result.intermediate.sections,
            preferences,
          })
        );
      } else if (method === 'link') {
        const result = await urlLearningPipeline.processUrl(linkUrl, {
          educationLevel,
          preferences,
          onProgress: (message) => setLinkStatus(message),
        });

        curriculum = result.curriculum;
        topicForRoute = result.intermediate.title || linkUrl;
        sourceType = 'link';
        sourceInput = linkUrl;

        localStorage.setItem(
          'modulearn:lastUrlPipeline',
          JSON.stringify({
            inputUrl: linkUrl,
            processedAt: new Date().toISOString(),
            resolvedUrl: result.intermediate.resolvedUrl,
            fetchStrategy: result.intermediate.fetchStrategy,
            title: result.intermediate.title,
            description: result.intermediate.description,
            contentLength: result.intermediate.contentLength,
            preview: result.intermediate.preview,
            preferences,
          })
        );
      } else {
        curriculum = await groqService.generateCurriculum(content, educationLevel, preferences);
        sourceType = 'text';
        sourceInput = content;
      }

      console.log('Generated curriculum:', curriculum);

      // Navigate to structure page with generated data
      navigate('/app/structure', { 
        state: { 
          curriculum,
          topic: topicForRoute,
          educationLevel: profile.educationLevel,
          sourceType,
          sourceInput,
          preferences,
        } 
      });
    } catch (err) {
      console.error('Generation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate path. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-4">Start your next journey</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">Input your source material and our AI will structure it into logical modules tailored to your learning level.</p>
        {profile && (
          <p className="text-peach font-semibold mt-3">
            📚 Creating path for: <span className="font-bold">{profile.educationLevel === 'school' ? `Grade ${profile.class}` : profile.course || 'Your Level'}</span>
          </p>
        )}
      </div>

      {/* Method Selected */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        <button 
          onClick={() => setMethod('text')}
          className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${method === 'text' ? 'border-peach bg-peach/5 text-peach' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method === 'text' ? 'bg-peach text-white shadow-lg shadow-peach/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <Type size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight">Paste Topic</span>
        </button>

        <button 
          onClick={() => setMethod('upload')}
          className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${method === 'upload' ? 'border-peach bg-peach/5 text-peach' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method === 'upload' ? 'bg-peach text-white shadow-lg shadow-peach/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <Upload size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight">Upload PDF</span>
          <span className="text-[10px] font-semibold text-zinc-400">Now Available</span>
        </button>

        <button 
          onClick={() => setMethod('link')}
          className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${method === 'link' ? 'border-peach bg-peach/5 text-peach' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method === 'link' ? 'bg-peach text-white shadow-lg shadow-peach/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <LinkIcon size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight">URL / Link</span>
          <span className="text-[10px] font-semibold text-zinc-400">Live</span>
        </button>
      </div>

      {/* Content Input Form */}
      <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none">
        {method === 'text' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Topic or Description</label>
              <textarea 
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setError('');
                }}
                placeholder="Example: React Hooks, Quantum Physics, Web Design Principles, Machine Learning Fundamentals..."
                className="w-full h-48 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-6 outline-none focus:ring-2 focus:ring-peach/20 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
              ></textarea>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-zinc-400">{content.length} characters</p>
                <p className="text-xs text-zinc-400">Minimum 5 characters required</p>
              </div>
            </div>

            {/* Education Level Info */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={18} className="text-peach" />
                <h4 className="font-bold text-sm dark:text-white">AI Customization</h4>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">Your learning path will be tailored to:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-peach"></div>
                  <span className="text-xs font-semibold dark:text-zinc-300">
                    Level: {profile?.educationLevel === 'school' ? `Grade ${profile.class}` : profile?.course || 'Professional'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-peach"></div>
                  <span className="text-xs font-semibold dark:text-zinc-300">Personalized Structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-peach"></div>
                  <span className="text-xs font-semibold dark:text-zinc-300">Estimated Duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-peach"></div>
                  <span className="text-xs font-semibold dark:text-zinc-300">Interactive Modules</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {method === 'upload' && (
          <div
            className="h-64 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-[32px] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 group hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setSelectedPdf(file);
                setError('');
                setUploadStatus('');
              }}
            />
            <Upload size={40} className="text-zinc-300 mb-4 group-hover:text-peach transition-colors" />
            <p className="font-bold text-zinc-400">Select your PDF file</p>
            <p className="text-zinc-300 text-xs mt-1">Maximum file size 25MB</p>
            {selectedPdf && (
              <p className="mt-4 text-xs font-semibold text-peach px-4 text-center break-all">
                Selected: {selectedPdf.name}
              </p>
            )}
            {uploadStatus && (
              <p className="mt-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-300 text-center px-6">
                {uploadStatus}
              </p>
            )}
          </div>
        )}

        {method === 'link' && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Documentation Link</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setError('');
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-6 outline-none focus:ring-2 focus:ring-peach/20 dark:text-white placeholder:text-zinc-400"
                placeholder="https://react.dev/learn"
              />
              <p className="mt-2 text-xs text-zinc-400">
                Paste an article/docs/tutorial URL. We will extract key content and create a curriculum.
              </p>
              {linkStatus && (
                <p className="mt-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-300">
                  {linkStatus}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 space-y-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">How deeply do you want to learn?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DEPTH_OPTIONS.map((option) => {
                const selected = learningDepth === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLearningDepth(option.value)}
                    className={`text-left p-4 rounded-2xl border transition-all ${selected
                      ? 'border-peach bg-peach/10 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500'
                    }`}
                  >
                    <p className={`text-sm font-bold ${selected ? 'text-peach' : 'text-zinc-800 dark:text-zinc-100'}`}>
                      {option.label}
                    </p>
                    <p className={`mt-1 text-xs ${selected ? 'text-peach/90' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">How familiar are you with this topic?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FAMILIARITY_OPTIONS.map((option) => {
                const selected = topicFamiliarity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTopicFamiliarity(option.value)}
                    className={`text-left p-4 rounded-2xl border transition-all ${selected
                      ? 'border-peach bg-peach/10 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500'
                    }`}
                  >
                    <p className={`text-sm font-bold ${selected ? 'text-peach' : 'text-zinc-800 dark:text-zinc-100'}`}>
                      {option.label}
                    </p>
                    <p className={`mt-1 text-xs ${selected ? 'text-peach/90' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-12 flex items-center justify-between">
          <div className="flex items-center gap-3 text-zinc-400">
            <Sparkles size={18} className="text-peach" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {loading ? 'Generating with Groq AI...' : 'AI-powered curriculum generation'}
            </span>
          </div>
          <button 
            onClick={handleCreate}
            disabled={
              loading ||
              profileLoading ||
              (method === 'text' && content.trim().length < 5) ||
              (method === 'upload' && !selectedPdf) ||
              (method === 'link' && !linkUrl.trim())
            }
            className="bg-peach text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-peach/90 transition-all shadow-lg shadow-peach/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> 
                Generating...
              </>
            ) : (
              <>
                Generate Path {!loading && <ChevronRight size={20} />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePath;
