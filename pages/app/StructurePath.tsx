
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Loader2,
  Brain,
  X,
  Download,
  ListTree,
  ZoomIn,
  ZoomOut,
  LocateFixed
} from 'lucide-react';
import { GeneratedCurriculum, CurriculumModule, LearningPreferences } from '../../backend/groqService.ts';
import { groqService } from '../../backend/groqService.ts';
import { db } from '../../lib/database.ts';
import { estimateLearningDuration } from '../../lib/durationEstimate.ts';
import 'jsmind/style/jsmind.css';

type MindNode = {
  id: string;
  topic: string;
  children?: MindNode[];
};

type MindData = {
  meta: {
    name: string;
    author: string;
    version: string;
  };
  format: 'node_tree';
  data: MindNode;
};

interface LocationState {
  curriculum: GeneratedCurriculum;
  topic: string;
  educationLevel: string;
  sourceType?: 'text' | 'upload' | 'link';
  sourceInput?: string;
  preferences?: LearningPreferences;
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
  const [saveError, setSaveError] = useState('');
  const [savingPath, setSavingPath] = useState(false);
  const [sourceType, setSourceType] = useState<'text' | 'upload' | 'link'>('text');
  const [sourceInput, setSourceInput] = useState('');
  const [preferences, setPreferences] = useState<LearningPreferences>({
    depth: 'structured_learning',
    familiarity: 'new_to_topic',
  });
  const [showMindmap, setShowMindmap] = useState(false);
  const [mindmapError, setMindmapError] = useState('');
  const [mindmapDensity, setMindmapDensity] = useState<'concise' | 'detailed'>('concise');
  const [downloadingMindmap, setDownloadingMindmap] = useState(false);
  const [mindmapZoom, setMindmapZoom] = useState(1);
  const mindmapContainerRef = useRef<HTMLDivElement | null>(null);
  const mindmapInstanceRef = useRef<any>(null);

  const toNodeId = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'node';

  const truncate = (value: string, max = 80): string => {
    if (!value) return '';
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
  };

  const normalizeTopicName = (value: string): string => {
    return value
      .replace(/^\s*\d+[.)-]\s*/, '')
      .replace(/^\s*(module|part|chapter|section)\s*\d+\s*[:.-]?\s*/i, '')
      .replace(/^\s*[-*]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const splitTopicHierarchy = (value: string): string[] => {
    const cleaned = normalizeTopicName(value);
    if (!cleaned) return [];

    const arrowParts = cleaned
      .split(/\s*(?:->|=>|>|\\)\s*/)
      .map((part) => normalizeTopicName(part))
      .filter(Boolean);
    if (arrowParts.length > 1) {
      return arrowParts;
    }

    const colonParts = cleaned
      .split(/\s*:\s*/)
      .map((part) => normalizeTopicName(part))
      .filter(Boolean);
    if (colonParts.length > 1 && colonParts[0].length <= 36) {
      return colonParts;
    }

    const dashParts = cleaned
      .split(/\s+-\s+/)
      .map((part) => normalizeTopicName(part))
      .filter(Boolean);
    if (dashParts.length > 1 && dashParts[0].length <= 30) {
      return dashParts;
    }

    const slashParts = cleaned
      .split(/\s*\/\s*/)
      .map((part) => normalizeTopicName(part))
      .filter(Boolean);
    if (slashParts.length > 1 && slashParts.length <= 3) {
      return slashParts;
    }

    return [cleaned];
  };

  const mindData = useMemo<MindData>(() => {
    const rootTopic = curriculum?.title || 'Learning Path';
    const maxModules = mindmapDensity === 'concise' ? 6 : 12;
    const maxSubtopics = mindmapDensity === 'concise' ? 2 : 5;

    const selectedModules = (modules || []).slice(0, maxModules);
    const rootNode: MindNode = { id: 'root', topic: rootTopic, children: [] };
    let nodeCount = 0;

    const nextNodeId = (prefix: string, label: string) => {
      nodeCount += 1;
      return `${prefix}_${nodeCount}_${toNodeId(label)}`;
    };

    const getOrCreateChild = (parent: MindNode, topic: string, prefix: string): MindNode => {
      const safeTopic = truncate(normalizeTopicName(topic), 72);
      if (!parent.children) {
        parent.children = [];
      }

      const existing = parent.children.find((child) => child.topic.toLowerCase() === safeTopic.toLowerCase());
      if (existing) {
        return existing;
      }

      const child: MindNode = {
        id: nextNodeId(prefix, safeTopic),
        topic: safeTopic,
      };
      parent.children.push(child);
      return child;
    };

    selectedModules.forEach((module) => {
      const moduleTitle = normalizeTopicName(module.title) || 'Topic Module';
      const moduleNode = getOrCreateChild(rootNode, moduleTitle, 'module');

      if (mindmapDensity === 'detailed' && module.description) {
        getOrCreateChild(moduleNode, `Focus: ${truncate(module.description, 64)}`, 'focus');
      }

      (module.subtopics || []).slice(0, maxSubtopics).forEach((subtopic) => {
        const hierarchy = splitTopicHierarchy(subtopic);
        let currentNode = moduleNode;

        hierarchy.forEach((segment, index) => {
          currentNode = getOrCreateChild(currentNode, segment, index === 0 ? 'subtopic' : 'detail');
        });
      });
    });

    return {
      meta: {
        name: 'Modulearn Mindmap',
        author: 'Modulearn',
        version: '1.0',
      },
      format: 'node_tree',
      data: rootNode,
    };
  }, [curriculum, modules, mindmapDensity]);

  const handleZoomInMindmap = () => {
    const instance = mindmapInstanceRef.current;
    if (!instance || !instance.view) return;
    instance.view.zoom_in();
    setMindmapZoom(instance.view.zoom_current || 1);
  };

  const handleZoomOutMindmap = () => {
    const instance = mindmapInstanceRef.current;
    if (!instance || !instance.view) return;
    instance.view.zoom_out();
    setMindmapZoom(instance.view.zoom_current || 1);
  };

  const handleResetMindmapView = () => {
    const instance = mindmapInstanceRef.current;
    if (!instance || !instance.view) return;

    instance.view.set_zoom(1);
    setMindmapZoom(1);
    if (typeof instance.scroll_node_to_center === 'function') {
      instance.scroll_node_to_center(instance.get_root());
    }
  };

  const handleDownloadMindmap = async () => {
    if (!mindmapContainerRef.current) {
      return;
    }

    setDownloadingMindmap(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const panel = mindmapContainerRef.current.querySelector('.jsmind-inner') as HTMLDivElement | null;
      const captureTarget = panel || mindmapContainerRef.current;

      const originalStyles = {
        width: captureTarget.style.width,
        height: captureTarget.style.height,
        overflow: captureTarget.style.overflow,
      };
      const originalScroll = {
        left: captureTarget.scrollLeft,
        top: captureTarget.scrollTop,
      };

      const fullWidth = Math.max(captureTarget.scrollWidth, captureTarget.clientWidth);
      const fullHeight = Math.max(captureTarget.scrollHeight, captureTarget.clientHeight);

      captureTarget.style.width = `${fullWidth}px`;
      captureTarget.style.height = `${fullHeight}px`;
      captureTarget.style.overflow = 'visible';
      captureTarget.scrollLeft = 0;
      captureTarget.scrollTop = 0;

      let canvas: HTMLCanvasElement;
      try {
        await new Promise((resolve) => setTimeout(resolve, 60));

        canvas = await html2canvas(captureTarget, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          width: fullWidth,
          height: fullHeight,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
          scrollX: 0,
          scrollY: 0,
        });
      } finally {
        captureTarget.style.width = originalStyles.width;
        captureTarget.style.height = originalStyles.height;
        captureTarget.style.overflow = originalStyles.overflow;
        captureTarget.scrollLeft = originalScroll.left;
        captureTarget.scrollTop = originalScroll.top;
      }

      const link = document.createElement('a');
      const safeTitle = (curriculum?.title || 'mindmap').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      link.download = `${safeTitle}_mindmap.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Mindmap download error:', err);
      setMindmapError('Unable to export mindmap image right now.');
    } finally {
      setDownloadingMindmap(false);
    }
  };

  useEffect(() => {
    if (!showMindmap || !mindmapContainerRef.current) {
      return;
    }

    const renderMindmap = async () => {
      try {
        setMindmapError('');
        const jsMindModule = await import('jsmind');
        const JsMind = (jsMindModule as any).default || jsMindModule;

        const container = mindmapContainerRef.current;
        if (!container) {
          return;
        }

        container.innerHTML = '';
        const instance = new JsMind({
          container,
          editable: false,
          theme: 'primary',
          view: {
            hmargin: 80,
            vmargin: 50,
            line_width: 2,
            line_color: '#f58a67',
            draggable: true,
            zoom: {
              min: 0.35,
              max: 2.4,
              step: 0.12,
            },
          },
        });
        instance.show(mindData);
        mindmapInstanceRef.current = instance;
        setMindmapZoom(instance?.view?.zoom_current || 1);
      } catch (err) {
        console.error('Mindmap render error:', err);
        setMindmapError('Unable to render mindmap right now.');
      }
    };

    renderMindmap();

    return () => {
      mindmapInstanceRef.current = null;
    };
  }, [showMindmap, mindData]);

  useEffect(() => {
    const state = location.state as LocationState;
    
    if (!state?.curriculum) {
      setError('No curriculum data received. Please generate a new path.');
      setLoading(false);
      return;
    }

    setCurriculum(state.curriculum);
    setModules(state.curriculum.modules || []);
    setSourceType(state.sourceType || 'text');
    setSourceInput(state.sourceInput || state.topic || state.curriculum.title);
    setPreferences(state.preferences || { depth: 'structured_learning', familiarity: 'new_to_topic' });
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

    setSavingPath(true);
    setSaveError('');
    try {
      const saved = await db.saveGeneratedLearningPath({
        curriculum,
        modules,
        sourceType,
        sourceInput: sourceInput || curriculum.title,
        metadata: {
          generationPreferences: preferences,
        },
      });

      navigate(`/app/path/${saved.id}`, {
        state: {
          curriculum,
          modules,
          topic: curriculum.title,
          educationLevel: curriculum.educationLevel,
          generationPreferences: preferences,
        },
      });
    } catch (err) {
      console.error('Failed to save learning path:', err);
      const message = err instanceof Error ? err.message : 'Failed to save learning path.';
      setSaveError(message);
    } finally {
      setSavingPath(false);
    }
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
  const totalTopics = modules.reduce((sum, m) => sum + (m.subtopics?.length || 0), 0);
  const { totalHours, minHours, maxHours, durationHint } = estimateLearningDuration({
    moduleCount: modules.length,
    totalMinutes,
    preferences,
  });

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
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Usually {minHours}-{maxHours} hrs for this setup</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Total Topics</p>
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-peach" />
                <span className="text-2xl font-bold dark:text-white">
                  {totalTopics}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Level</p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold dark:text-white capitalize">{curriculum.educationLevel}</span>
                <button
                  onClick={() => setShowMindmap(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold uppercase tracking-widest hover:bg-peach hover:text-white transition-all"
                >
                  <Brain size={13} /> Mindmap
                </button>
              </div>
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
            <p className="text-zinc-400 text-sm">{durationHint} • {totalHours} hrs • {totalTopics} topics</p>
          </div>
        </div>
        <button 
          onClick={handleCreatePath}
          disabled={savingPath}
          className="bg-peach text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-2 hover:bg-peach/90 transition-all shadow-xl shadow-peach/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {savingPath ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              Start Learning <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{saveError}</p>
        </div>
      )}

      {showMindmap && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">Topic Mindmap</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {mindmapDensity === 'concise'
                    ? 'Concise map showing key parts of the topic.'
                    : 'Detailed map showing parts, focus and subtopics.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setMindmapDensity('concise')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${mindmapDensity === 'concise' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white'}`}
                  >
                    Concise
                  </button>
                  <button
                    onClick={() => setMindmapDensity('detailed')}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${mindmapDensity === 'detailed' ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white'}`}
                  >
                    Detailed
                  </button>
                </div>

                <button
                  onClick={handleDownloadMindmap}
                  disabled={downloadingMindmap}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold uppercase tracking-widest hover:bg-peach hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download as image"
                >
                  {downloadingMindmap ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Image
                </button>

                <button
                  onClick={() => setShowMindmap(false)}
                  className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950">
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                <ListTree size={13} className="text-peach" />
                Topic names are arranged as parent-child branches. Drag to pan, scroll both directions.
              </div>
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={handleZoomOutMindmap}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  title="Zoom out"
                >
                  <ZoomOut size={13} /> Zoom Out
                </button>
                <button
                  onClick={handleZoomInMindmap}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  title="Zoom in"
                >
                  <ZoomIn size={13} /> Zoom In
                </button>
                <button
                  onClick={handleResetMindmapView}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  title="Reset zoom and center"
                >
                  <LocateFixed size={13} /> Reset ({Math.round(mindmapZoom * 100)}%)
                </button>
              </div>
              {mindmapError ? (
                <div className="h-[520px] flex items-center justify-center text-sm font-medium text-red-500">{mindmapError}</div>
              ) : (
                <div
                  ref={mindmapContainerRef}
                  className="h-[520px] w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-auto touch-pan-x touch-pan-y"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructurePath;
