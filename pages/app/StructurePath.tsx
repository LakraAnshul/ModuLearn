
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Edit2,
  Clock,
  BookOpen,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { GeneratedCurriculum, CurriculumModule } from '../../backend/groqService.ts';
import { groqService } from '../../backend/groqService.ts';

interface LocationState {
  curriculum: GeneratedCurriculum;
  topic: string;
  educationLevel: string;
}

const StructurePath: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modules, setModules] = useState<CurriculumModule[]>([]);
  const [curriculum, setCurriculum] = useState<GeneratedCurriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const state = location.state as LocationState;
    
    if (!state?.curriculum) {
      setError('No curriculum data received. Please generate a new path.');
      setLoading(false);
      return;
    }

    setCurriculum(state.curriculum);
    setModules(state.curriculum.modules || []);
    setLoading(false);
  }, [location]);

  const handleAddModule = () => {
    const newModule: CurriculumModule = {
      id: `module_${modules.length + 1}`,
      title: 'New Module',
      description: 'Module description',
      estimatedMinutes: 30,
      subtopics: ['Subtopic 1', 'Subtopic 2'],
    };
    setModules([...modules, newModule]);
  };

  const handleDeleteModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const handleRefineModule = async (module: CurriculumModule) => {
    if (!curriculum) return;
    
    try {
      setEditingId(module.id);
      const refined = await groqService.refineModule(
        module.title,
        curriculum.title,
        curriculum.educationLevel
      );
      setModules(modules.map(m => m.id === module.id ? refined : m));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to refine module:', err);
      alert('Failed to refine module');
      setEditingId(null);
    }
  };

  const handleCreatePath = async () => {
    if (!curriculum) return;
    
    // Save the curriculum with modules to the database
    console.log('Creating path with modules:', modules);
    navigate('/app/path/1', { 
      state: { 
        curriculum,
        modules,
        topic: curriculum.title,
        educationLevel: curriculum.educationLevel
      } 
    }); // Navigate to learning interface
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-peach" size={40} />
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Preparing your curriculum...</p>
      </div>
    );
  }

  if (error || !curriculum) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-6 rounded-[32px] flex items-center gap-4">
          <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400">Error Loading Curriculum</h3>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/app/create')}
          className="mt-6 flex items-center gap-2 text-peach font-bold text-xs uppercase tracking-widest hover:underline"
        >
          <ArrowLeft size={16} /> Try Again
        </button>
      </div>
    );
  }

  const totalMinutes = modules.reduce((sum, m) => sum + (m.estimatedMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="max-w-5xl mx-auto py-10">
      <button 
        onClick={() => navigate('/app/create')}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-bold text-xs uppercase tracking-widest mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Input
      </button>

      {/* Header Section */}
      <div className="mb-12">
        <div className="bg-gradient-to-r from-peach/10 to-transparent dark:from-peach/5 p-8 rounded-[32px] border border-peach/20 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-2">{curriculum.title}</h1>
              <p className="text-zinc-600 dark:text-zinc-400">{curriculum.description}</p>
            </div>
            <div className="text-right ml-8">
              <div className="text-4xl font-black text-peach mb-2">{modules.length}</div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Modules</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Total Duration</p>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-peach" />
                <span className="text-2xl font-bold dark:text-white">{totalHours} hrs</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Total Topics</p>
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-peach" />
                <span className="text-2xl font-bold dark:text-white">
                  {modules.reduce((sum, m) => sum + (m.subtopics?.length || 0), 0)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Level</p>
              <span className="text-lg font-bold dark:text-white capitalize">{curriculum.educationLevel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold dark:text-white">Learning Modules</h2>
          <button 
            onClick={handleAddModule}
            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-6 py-3 rounded-xl font-bold transition-all text-sm"
          >
            <Plus size={18} /> Add Module
          </button>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4 mb-16">
        {modules.map((mod, idx) => (
          <div key={mod.id} className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-100 dark:border-zinc-800 overflow-hidden transition-all hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-lg dark:hover:shadow-none hover:shadow-zinc-100">
            {/* Module Header */}
            <div 
              className="p-6 flex items-start gap-6 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              onClick={() => setExpandedId(expandedId === mod.id ? null : mod.id)}
            >
              <button className="mt-1 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 cursor-grab shrink-0">
                <GripVertical size={20} />
              </button>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-peach/10 flex items-center justify-center text-sm font-black text-peach">
                      {idx + 1}
                    </div>
                    <h3 className="text-lg font-bold dark:text-white">{mod.title}</h3>
                  </div>
                  <ChevronRight 
                    size={20} 
                    className={`text-zinc-400 transition-transform ${expandedId === mod.id ? 'rotate-90' : ''}`}
                  />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{mod.description}</p>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    <Clock size={16} className="text-peach" />
                    {mod.estimatedMinutes} mins
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    <BookOpen size={16} className="text-peach" />
                    {mod.subtopics?.length || 0} topics
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefineModule(mod);
                  }}
                  disabled={editingId === mod.id}
                  className="p-2 text-zinc-400 hover:text-peach transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ask AI to add more details"
                >
                  {editingId === mod.id ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModule(mod.id);
                  }}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Expanded Subtopics */}
            {expandedId === mod.id && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
                <h4 className="text-sm font-bold dark:text-white mb-4 text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
                  Subtopics ({mod.subtopics?.length || 0})
                </h4>
                <div className="space-y-2">
                  {mod.subtopics?.map((subtopic, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800"
                    >
                      <div className="w-6 h-6 rounded-full bg-peach/10 flex items-center justify-center text-xs font-bold text-peach">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium dark:text-zinc-300">{subtopic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-10 bg-gradient-to-r from-zinc-950 to-zinc-900 dark:from-zinc-900 dark:to-zinc-800 rounded-[40px] text-white shadow-2xl transition-colors duration-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} className="text-peach" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Ready to start learning?</h4>
            <p className="text-zinc-400 text-sm">{modules.length} modules • {totalHours} hours • {modules.reduce((sum, m) => sum + (m.subtopics?.length || 0), 0)} topics</p>
          </div>
        </div>
        <button 
          onClick={handleCreatePath}
          className="bg-peach text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-peach/90 transition-all shadow-xl shadow-peach/20"
        >
          Start Learning <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default StructurePath;
