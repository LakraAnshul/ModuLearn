
import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, HelpCircle, LogOut, Moon, Sun, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, UserProfile } from '../../lib/database.ts';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    fullName: '',
    email: '',
    gender: '',
    age: '',
  });

  useEffect(() => {
    async function loadProfile() {
      const data = await db.getProfile();
      if (data) {
        setProfile(data);
        setFormData({
          fullName: data.fullName,
          email: data.email,
          gender: data.gender,
          age: data.age,
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await db.saveProfile(formData);
      const updatedProfile = await db.getProfile();
      if (updatedProfile) setProfile(updatedProfile);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-peach" size={40} />
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage your account and preferences.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-xl shadow-zinc-100 dark:shadow-none">
        <div className="flex flex-col md:flex-row">
          {/* Settings Nav */}
          <aside className="w-full md:w-64 bg-zinc-50/50 dark:bg-zinc-900/50 border-r border-zinc-100 dark:border-zinc-800 p-6 flex flex-col gap-1">
            <button className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm text-peach font-bold text-sm">
              <User size={18} /> Profile
            </button>
            <button className="flex items-center gap-3 px-6 py-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold text-sm transition-colors">
              <Bell size={18} /> Notifications
            </button>
            <button className="flex items-center gap-3 px-6 py-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold text-sm transition-colors">
              <Shield size={18} /> Security
            </button>
            <button className="flex items-center gap-3 px-6 py-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold text-sm transition-colors">
              <Palette size={18} /> Appearance
            </button>
            <button className="flex items-center gap-3 px-6 py-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold text-sm transition-colors">
              <HelpCircle size={18} /> Support
            </button>
          </aside>

          {/* Settings Content */}
          <div className="flex-1 p-8 md:p-12">
            <div className="mb-12">
               <h3 className="text-2xl font-bold mb-8 dark:text-white">Personal Information</h3>
               <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Full Name</label>
                   <input 
                     type="text" 
                     className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-5 py-4 outline-none font-medium dark:text-white" 
                     value={formData.fullName || ''}
                     onChange={(e) => handleInputChange('fullName', e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Email</label>
                   <input 
                     type="email" 
                     className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-5 py-4 outline-none font-medium dark:text-white" 
                     value={formData.email || ''}
                     disabled
                     title="Email cannot be changed"
                   />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Gender</label>
                     <select 
                       className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-5 py-4 outline-none font-medium dark:text-white"
                       value={formData.gender || ''}
                       onChange={(e) => handleInputChange('gender', e.target.value)}
                     >
                       <option value="">Select gender</option>
                       <option value="male">Male</option>
                       <option value="female">Female</option>
                       <option value="other">Other</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Age</label>
                     <input 
                       type="text" 
                       className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-5 py-4 outline-none font-medium dark:text-white" 
                       value={formData.age || ''}
                       onChange={(e) => handleInputChange('age', e.target.value)}
                     />
                   </div>
                 </div>
               </div>
            </div>

            <div className="mb-12">
               <h3 className="text-2xl font-bold mb-8 dark:text-white">Preferences</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-800 rounded-[24px]">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center shadow-sm">
                           {isDark ? <Moon size={18} className="text-peach" /> : <Sun size={18} className="text-peach" />}
                        </div>
                        <div>
                           <h5 className="font-bold text-sm dark:text-white">Dark Mode</h5>
                           <p className="text-xs text-zinc-400 mt-1">Adjust the appearance of the app</p>
                        </div>
                     </div>
                     <button 
                       onClick={toggleDarkMode}
                       className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors duration-200 ${isDark ? 'bg-peach' : 'bg-zinc-300'}`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-800 rounded-[24px]">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center shadow-sm">
                           <Shield size={18} className="text-zinc-400" />
                        </div>
                        <div>
                           <h5 className="font-bold text-sm dark:text-white">Adaptive Quizzing</h5>
                           <p className="text-xs text-zinc-400 mt-1">Adjust difficulty based on performance</p>
                        </div>
                     </div>
                     <div className="w-12 h-6 bg-peach rounded-full flex items-center px-1">
                        <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm"></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-4">
               <button 
                 onClick={handleSaveChanges}
                 disabled={saving}
                 className="bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 {saving && <Loader2 size={18} className="animate-spin" />}
                 Save Changes
               </button>
               <button 
                 onClick={() => navigate('/app')}
                 className="px-8 py-4 rounded-xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center gap-2"
               >
                 <LogOut size={18} /> Sign Out
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;