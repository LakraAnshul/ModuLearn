import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight, Search, Loader2 } from 'lucide-react';
import { db, SavedLearningPathSummary } from '../../lib/database.ts';
import { estimateLearningDuration } from '../../lib/durationEstimate.ts';

const timeAgo = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

const LibraryPage: React.FC = () => {
  const [paths, setPaths] = useState<SavedLearningPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadAllPaths = async () => {
      try {
        // No limit => fetch full library for current user.
        const data = await db.listUserLearningPaths();
        setPaths(data);
      } catch (err) {
        console.error('Failed to load library paths:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllPaths();
  }, []);

  const filteredPaths = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paths;

    return paths.filter((path) =>
      path.title.toLowerCase().includes(q) || path.description.toLowerCase().includes(q)
    );
  }, [paths, query]);

  const getPathDuration = (path: SavedLearningPathSummary) =>
    estimateLearningDuration({
      moduleCount: path.moduleCount,
      totalMinutes: path.totalMinutes,
      preferences: path.generationPreferences,
    });

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-peach" size={40} />
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Loading your library...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">My Library</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">All generated learning paths in one place.</p>
        </div>

        <div className="w-full md:w-80 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl flex items-center gap-3">
          <Search size={18} className="text-zinc-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search paths..."
            className="bg-transparent border-none outline-none text-sm w-full font-medium dark:text-white dark:placeholder-zinc-500"
          />
        </div>
      </div>

      {filteredPaths.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-10 rounded-[24px] border border-zinc-100 dark:border-zinc-800 text-center">
          <h4 className="font-bold text-lg mb-2 dark:text-white">No matching learning paths</h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {paths.length === 0
              ? 'Create your first learning path to see it here.'
              : 'Try a different search keyword.'}
          </p>
          <Link
            to="/app/create"
            className="inline-flex items-center gap-2 bg-peach text-white px-6 py-3 rounded-xl font-bold hover:bg-peach/90 transition-all"
          >
            Create Path <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredPaths.map((path) => {
            const duration = getPathDuration(path);

            return (
            <div
              key={path.id}
              className="group bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800 hover:border-peach/30 transition-all hover:shadow-lg hover:shadow-zinc-200/40 dark:hover:shadow-none"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-peach group-hover:text-white transition-all">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold dark:text-white mb-1">{path.title}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2">{path.description || 'No description available.'}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      <span>{path.moduleCount} Modules</span>
                      <span>•</span>
                      <span>{duration.totalHours} Hrs</span>
                      <span>•</span>
                      <span>{path.topicCount} Topics</span>
                      <span>•</span>
                      <span>{Math.round(path.progress)}% Progress</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(path.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/app/path/${path.id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 transition-all font-bold text-sm"
                >
                  Open <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
