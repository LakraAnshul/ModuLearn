
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Target, Flame, GraduationCap } from 'lucide-react';

const data = [
  { name: 'Mon', hours: 2.4 },
  { name: 'Tue', hours: 4.1 },
  { name: 'Wed', hours: 1.8 },
  { name: 'Thu', hours: 5.2 },
  { name: 'Fri', hours: 3.5 },
  { name: 'Sat', hours: 2.1 },
  { name: 'Sun', hours: 0.8 },
];

const ProgressPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">My Learning Journey</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Tracking your growth since October 2023.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { icon: <Target className="text-peach" />, label: "Target Set", val: "12/20", sub: "Modules" },
          { icon: <Flame className="text-orange-500" />, label: "Day Streak", val: "14", sub: "Days" },
          { icon: <Trophy className="text-yellow-500" />, label: "Total Points", val: "2,450", sub: "XP" },
          { icon: <GraduationCap className="text-blue-500" />, label: "Certificates", val: "4", sub: "Earned" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors duration-200">
             <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-6">
                {item.icon}
             </div>
             <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">{item.label}</p>
             <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black dark:text-white">{item.val}</span>
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{item.sub}</span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-zinc-100 dark:border-zinc-800 shadow-xl dark:shadow-none shadow-zinc-100 transition-colors duration-200">
           <h3 className="text-xl font-bold mb-10 dark:text-white">Learning Activity (Hours/Day)</h3>
           <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 700, fill: isDarkMode ? '#52525b' : '#A1A1AA' }}
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ color: isDarkMode ? '#f58a67' : '#f58a67' }}
                  />
                  <Bar dataKey="hours" radius={[10, 10, 10, 10]} barSize={40}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours > 4 ? '#f58a67' : (isDarkMode ? '#27272a' : '#f4f4f5')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-zinc-950 dark:bg-zinc-900 p-10 rounded-[40px] text-white flex flex-col justify-between transition-colors duration-200">
           <div>
              <h3 className="text-xl font-bold mb-6">Mastery Level</h3>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3">
                       <span className="text-zinc-500 dark:text-zinc-400">React Core</span>
                       <span>85%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 dark:bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-peach w-[85%] rounded-full"></div>
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3">
                       <span className="text-zinc-500 dark:text-zinc-400">UI/UX Basics</span>
                       <span>42%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 dark:bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-white dark:bg-zinc-500 w-[42%] rounded-full"></div>
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-3">
                       <span className="text-zinc-500 dark:text-zinc-400">System Design</span>
                       <span>12%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 dark:bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-zinc-700 dark:bg-zinc-600 w-[12%] rounded-full"></div>
                    </div>
                 </div>
              </div>
           </div>
           <div className="mt-12 bg-white/5 dark:bg-white/10 p-6 rounded-2xl border border-white/10 transition-colors">
              <p className="text-sm font-medium leading-relaxed italic text-zinc-400 dark:text-zinc-300">
                "You're in the top 10% of learners for React performance topics this month!"
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
