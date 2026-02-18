
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Type, Link as LinkIcon, Sparkles, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { db, UserProfile } from '../../lib/database.ts';
import { groqService, GeneratedCurriculum } from '../../backend/groqService.ts';

const CreatePath: React.FC = () => {
  const [method, setMethod] = useState<'upload' | 'text' | 'link'>('text');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
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
    if (!content || content.trim().length < 5) {
      setError('Please enter a topic with at least 5 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (!profile) {
        setError('Unable to load your profile. Please refresh and try again.');
        return;
      }

      // Generate curriculum using Groq API
      const educationLevel = getEducationLevelForGroq();
      const curriculum: GeneratedCurriculum = await groqService.generateCurriculum(
        content,
        educationLevel
      );

      console.log('Generated curriculum:', curriculum);

      // Navigate to structure page with generated data
      navigate('/app/structure', { 
        state: { 
          curriculum,
          topic: content,
          educationLevel: profile.educationLevel
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
          disabled={true}
          className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 opacity-50 cursor-not-allowed ${method === 'upload' ? 'border-peach bg-peach/5 text-peach' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method === 'upload' ? 'bg-peach text-white shadow-lg shadow-peach/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <Upload size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight">Upload PDF</span>
          <span className="text-[10px] font-semibold text-zinc-400">Coming Soon</span>
        </button>

        <button 
          onClick={() => setMethod('link')}
          disabled={true}
          className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 opacity-50 cursor-not-allowed ${method === 'link' ? 'border-peach bg-peach/5 text-peach' : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${method === 'link' ? 'bg-peach text-white shadow-lg shadow-peach/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <LinkIcon size={24} />
          </div>
          <span className="font-bold text-sm tracking-tight">URL / Link</span>
          <span className="text-[10px] font-semibold text-zinc-400">Coming Soon</span>
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
          <div className="h-64 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-[32px] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 group hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
            <Upload size={40} className="text-zinc-300 mb-4 group-hover:text-peach transition-colors" />
            <p className="font-bold text-zinc-400">Drag & Drop your PDF here</p>
            <p className="text-zinc-300 text-xs mt-1">Maximum file size 25MB</p>
          </div>
        )}

        {method === 'link' && (
          <div className="space-y-6">
             <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Documentation Link</label>
             <input type="text" className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl p-6 outline-none dark:text-white" placeholder="https://react.dev/learn/performance..." />
          </div>
        )}

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
            disabled={loading || profileLoading || (method === 'text' && content.trim().length < 5)}
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
