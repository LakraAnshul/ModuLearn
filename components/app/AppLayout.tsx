import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Library, 
  LineChart, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase.ts';
import { db, UserProfile } from '../../lib/database.ts';
import logo from '../logo.svg';

const SidebarItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active?: boolean }> = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all duration-300 group ${
      active 
        ? 'bg-peach text-white shadow-lg shadow-peach/20' 
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
    }`}
  >
    <span className={`${active ? 'text-white' : 'group-hover:text-peach transition-colors'}`}>
      {icon}
    </span>
    <span className="font-semibold text-sm tracking-tight">{label}</span>
  </Link>
);

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if we're in learning interface - hide sidebars for full content view
  const isLearningPath = currentPath.includes('/app/path/');

  useEffect(() => {
    async function checkAuth() {
      // Fixed: Using v2 getSession()
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate('/login');
        return;
      }
      
      try {
        const userData = await db.getProfile();
        // If user is authenticated but has no profile row, they need to onboard
        if (!userData) {
           navigate('/onboarding');
           return;
        }
        setProfile(userData);
      } catch (err) {
        console.error("Profile load failed", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await db.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-peach" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-zinc-950 transition-colors duration-200 overflow-x-hidden">
      {/* Sidebar - Hidden on learning path */}
      {!isLearningPath && (
        <aside className="w-72 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col fixed inset-y-0 left-0 z-40 transition-colors duration-200 max-w-[288px]">
          <div className="p-8 pb-12 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="ModuLearn" className="w-8 h-8 object-contain" />
              <span className="text-xl font-extrabold tracking-tight dark:text-white">ModuLearn</span>
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <SidebarItem 
              to="/app" 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={currentPath === '/app'} 
            />
            <SidebarItem 
              to="/app/create" 
              icon={<PlusCircle size={20} />} 
              label="Create New Path" 
              active={currentPath === '/app/create'} 
            />
            <SidebarItem 
              to="/app/progress" 
              icon={<LineChart size={20} />} 
              label="My Progress" 
              active={currentPath === '/app/progress'} 
            />
            <SidebarItem 
              to="/app" 
              icon={<Library size={20} />} 
              label="Library" 
              active={false} 
            />
            <SidebarItem 
              to="/app/settings" 
              icon={<Settings size={20} />} 
              label="Settings" 
              active={currentPath === '/app/settings'} 
            />
          </nav>

          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
             <button 
               onClick={handleLogout}
               className="w-full flex items-center gap-3 px-6 py-4 text-zinc-500 dark:text-zinc-400 hover:text-red-500 transition-colors font-semibold text-sm"
             >
               <LogOut size={20} />
               Logout
             </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isLearningPath ? 'ml-72' : 'ml-0'} w-full min-w-0 transition-all duration-300`}>
        {/* Header - Hidden on learning path */}
        {!isLearningPath && (
          <header className="h-24 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-10 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-200 w-full overflow-hidden">
            <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800 px-5 py-2.5 rounded-full w-96 max-w-full">
              <Search size={18} className="text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search library..." 
                className="bg-transparent border-none outline-none text-sm w-full font-medium dark:text-white dark:placeholder-zinc-500" 
              />
            </div>
            
            <div className="flex items-center gap-6">
              <button className="relative text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <Bell size={22} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-peach text-white text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-zinc-900">2</span>
              </button>
              <div className="flex items-center gap-3 pl-6 border-l border-zinc-100 dark:border-zinc-800">
                <div className="text-right">
                  <p className="text-sm font-bold dark:text-white">{profile?.fullName || 'User'}</p>
                  <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{profile?.educationLevel === 'college' ? (profile?.course || 'Student') : (profile?.class ? `Grade ${profile.class}` : 'Student')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                  {profile?.gender === 'male' ? (
                    // @ts-ignore
                    <dotlottie-wc
                      src="https://lottie.host/f1afaf8c-eb52-4aa2-98e1-eb16e7763be9/ksHfO64ZPM.lottie"
                      style={{ width: '100%', height: '100%' }}
                      autoplay
                      loop
                    />
                  ) : profile?.gender === 'female' ? (
                    // @ts-ignore
                    <dotlottie-wc
                      src="https://lottie.host/ba56c056-1033-493a-b947-55f8d8d650cd/5zKQs1SpaU.lottie"
                      style={{ width: '100%', height: '100%' }}
                      autoplay
                      loop
                    />
                  ) : (
                    <img src={`https://i.pravatar.cc/150?u=${profile?.id}`} className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        <div className={`${isLearningPath ? 'p-0' : 'p-10'} w-full overflow-x-hidden transition-all duration-300`}>
          <div className="w-full max-w-full overflow-x-hidden">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;