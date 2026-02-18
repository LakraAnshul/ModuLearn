import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { db, UserProfile } from '../../lib/database.ts';

const mockPaths = [
  { id: '1', title: 'React Performance Patterns', progress: 65, modules: 12, lastActive: '2 hours ago' },
  { id: '2', title: 'Modern UI Design Fundamentals', progress: 32, modules: 8, lastActive: 'Yesterday' },
  { id: '3', title: 'System Architecture Basics', progress: 90, modules: 15, lastActive: '3 days ago' },
];

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const data = await db.getProfile();
      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-peach" size={40} />
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Syncing with cloud...</p>
      </div>
    );
  }

  const firstName = profile?.fullName?.split(' ')[0] || 'Learner';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 tracking-tight">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Ready to continue your <span className="text-peach">{profile?.educationLevel === 'college' ? profile.course : 'School'}</span> journey?
          </p>
        </div>
        <Link 
          to="/app/create" 
          className="bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
        >
          <Zap size={20} className="text-peach fill-peach" />
          Create New Path
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <span className="text-peach font-bold uppercase tracking-widest text-[10px] block mb-4">Streak</span>
            <h3 className="text-4xl font-black mb-1 dark:text-white">14</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Days consecutive learning</p>
          </div>
          <div className="mt-8 flex gap-1">
             {[1,1,1,1,1,0,1].map((s, i) => (
               <div key={i} className={`flex-1 h-1.5 rounded-full ${s ? 'bg-peach' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <span className="text-peach font-bold uppercase tracking-widest text-[10px] block mb-4">Focus</span>
            <h3 className="text-4xl font-black mb-1 dark:text-white">{profile?.learningStyles?.length || 0}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">Preferred learning modes active</p>
          </div>
          <button className="mt-8 text-sm font-bold flex items-center gap-1 text-peach hover:underline">
            Review preferences <ChevronRight size={14} />
          </button>
        </div>

        <div className="bg-zinc-950 dark:bg-zinc-800 p-8 rounded-[32px] text-white flex flex-col justify-between shadow-2xl transition-colors duration-200">
          <div>
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] block mb-4">Course Level</span>
            <h3 className="text-4xl font-black mb-1">
              {profile?.educationLevel === 'school' ? `Grade ${profile.class}` : profile?.course || 'Active'}
            </h3>
            <p className="text-zinc-400 text-sm font-semibold">Your current educational focus</p>
          </div>
          <p className="mt-8 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Tailored to your profile</p>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold dark:text-white">Recent Learning Paths</h2>
        <button className="text-sm font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">View all</button>
      </div>

      <div className="grid gap-6">
        {mockPaths.map((path) => (
          <div 
            key={path.id} 
            className="group bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-100 dark:border-zinc-800 hover:border-peach/30 dark:hover:border-peach/30 transition-all hover:shadow-xl hover:shadow-zinc-200/40 dark:hover:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-peach group-hover:text-white transition-all">
                <Play size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1 dark:text-white">{path.title}</h4>
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Clock size={12} /> {path.lastActive}</span>
                  <span>•</span>
                  <span>{path.modules} Modules</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 md:gap-12">
              <div className="text-right w-full md:w-32">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">Progress</span>
                   <span className="text-xs font-bold dark:text-zinc-300">{path.progress}%</span>
                 </div>
                 <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-peach transition-all duration-1000" 
                      style={{ width: `${path.progress}%` }} 
                    />
                 </div>
              </div>
              <Link 
                to={`/app/path/${path.id}`}
                className="w-10 h-10 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-950 dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 transition-all"
              >
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;