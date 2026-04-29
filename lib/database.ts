import { supabase, supabaseUrl } from './supabase.ts';
import { GoogleGenAI, Type } from "@google/genai";
import { CurriculumModule, GeneratedCurriculum, LearningPreferences } from '../backend/groqService.ts';
import { normalizeLearningPreferences } from './durationEstimate.ts';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  languages: string[];
  gender: string;
  age: string;
  educationLevel: 'school' | 'college' | null;
  class?: string;
  field?: string;
  course?: string;
  domain?: string;
  goals: string[];
  learningStyles: string[];
  onboarded: boolean;
  createdAt: string;
}

export interface SaveGeneratedPathInput {
  curriculum: GeneratedCurriculum;
  modules: CurriculumModule[];
  sourceType: 'text' | 'upload' | 'link';
  sourceInput: string;
  metadata?: Record<string, unknown>;
}

export interface SavedLearningPathSummary {
  id: string;
  title: string;
  description: string;
  progress: number;
  moduleCount: number;
  topicCount: number;
  totalMinutes: number;
  totalEstimatedHours: number;
  generationPreferences: LearningPreferences;
  updatedAt: string;
  createdAt: string;
}

export interface SavedLearningPathDetail extends SavedLearningPathSummary {
  educationLevel: string;
  modules: CurriculumModule[];
  sourceType: 'text' | 'upload' | 'link';
  sourceInput: string;
  completedModuleIds: string[];
  currentModuleIndex: number;
  metadata: Record<string, unknown>;
}

export interface SaveQuizAttemptInput {
  learningPathId: string;
  moduleId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  total: number;
  questions?: unknown;
}

export interface QuizAttemptDbRecord {
  id: string;
  learningPathId: string;
  moduleId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  total: number;
  createdAt: string;
  /** Full question list with user's chosen answers, present when the attempt was saved with review data */
  questions?: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  userAnswers?: number[];
}

export interface SaveCodingAttemptInput {
  learningPathId: string;
  moduleId: string;
  language: string;
  passedCount: number;
  totalCount: number;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface CodingAttemptRecord {
  id: string;
  learningPathId: string;
  moduleId: string;
  language: string;
  passedCount: number;
  totalCount: number;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const getGeminiClient = () => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  return new GoogleGenAI({ apiKey });
};

const isConfigured = () => 
  supabaseUrl && 
  !supabaseUrl.includes('your-project-ref') && 
  !supabaseUrl.includes('placeholder');

const getCurrentUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Not authenticated');
  }
  return user.id;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const extractGenerationPreferences = (metadata: unknown): LearningPreferences => {
  if (!metadata || typeof metadata !== 'object') {
    return normalizeLearningPreferences();
  }

  const rawPrefs = (metadata as Record<string, unknown>).generationPreferences;
  if (!rawPrefs || typeof rawPrefs !== 'object') {
    return normalizeLearningPreferences();
  }

  return normalizeLearningPreferences(rawPrefs as Partial<LearningPreferences>);
};

export const db = {
  /**
   * Saves or updates the user profile in Supabase.
   * Allows passing an explicit userId to avoid race conditions during signup.
   */
  async saveProfile(profile: Partial<UserProfile>, explicitUserId?: string): Promise<void> {
    if (!isConfigured()) {
      console.error('Database not configured');
      return;
    }

    let userId = explicitUserId;
    let userEmail = profile.email;
    let fullName = profile.fullName;

    if (!userId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        // If we don't have a user and none was passed, we can't save.
        // This might happen if session is expired or email not verified yet.
        console.warn('saveProfile: No authenticated user found');
        throw new Error('Not authenticated');
      }
      userId = user.id;
      userEmail = userEmail || user.email;
      // For OAuth users (Google etc.), the name lives in user_metadata.
      // Use it as a fallback when fullName isn't explicitly provided.
      if (!fullName) {
        fullName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.user_metadata?.display_name;
      }
    }

    const profileData = {
      id: userId,
      full_name: fullName,
      email: userEmail,
      languages: profile.languages,
      gender: profile.gender,
      age: profile.age,
      education_level: profile.educationLevel,
      class: profile.class,
      field: profile.field,
      course: profile.course,
      domain: profile.domain,
      goals: profile.goals,
      learning_styles: profile.learningStyles,
      onboarded: profile.onboarded,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields to avoid overwriting with nulls if not intended
    Object.keys(profileData).forEach(key => (profileData as any)[key] === undefined && delete (profileData as any)[key]);

    const { error } = await supabase
      .from('profiles')
      .upsert(profileData);

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
  },

  /**
   * Retrieves the current user profile from Supabase.
   */
  async getProfile(): Promise<UserProfile | null> {
    if (!isConfigured()) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      languages: data.languages || [],
      gender: data.gender,
      age: data.age,
      educationLevel: data.education_level,
      class: data.class,
      field: data.field,
      course: data.course,
      domain: data.domain,
      goals: data.goals || [],
      learningStyles: data.learning_styles || [],
      onboarded: data.onboarded,
      createdAt: data.updated_at
    };
  },

  /**
   * Persists one generated learning path row with denormalized summary fields.
   * This keeps writes to a single insert and makes dashboard fetches very fast.
   */
  async saveGeneratedLearningPath(input: SaveGeneratedPathInput): Promise<{ id: string }> {
    if (!isConfigured()) {
      throw new Error('Database not configured');
    }

    const userId = await getCurrentUserId();
    const modules = Array.isArray(input.modules) ? input.modules : [];
    const moduleCount = modules.length;
    const topicCount = modules.reduce((sum, module) => sum + (module.subtopics?.length || 0), 0);
    const totalMinutes = modules.reduce((sum, module) => sum + toNumber(module.estimatedMinutes, 0), 0);
    const totalEstimatedHours = toNumber(input.curriculum.totalEstimatedHours, Math.ceil(totalMinutes / 60));

    const payload = {
      user_id: userId,
      title: input.curriculum.title || input.sourceInput,
      description: input.curriculum.description || '',
      education_level: input.curriculum.educationLevel || 'school',
      total_estimated_hours: totalEstimatedHours,
      total_minutes: totalMinutes,
      module_count: moduleCount,
      topic_count: topicCount,
      progress_percent: 0,
      current_module_index: 0,
      completed_module_ids: [] as string[],
      modules,
      source_type: input.sourceType,
      source_input: input.sourceInput,
      metadata: input.metadata || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('learning_paths')
      .insert(payload)
      .select('id')
      .single();

    if (error || !data?.id) {
      console.error('Failed to save generated path:', error);
      throw new Error(error?.message || 'Failed to save generated learning path');
    }

    return { id: data.id };
  },

  async listUserLearningPaths(limit?: number): Promise<SavedLearningPathSummary[]> {
    if (!isConfigured()) {
      return [];
    }

    const userId = await getCurrentUserId();
    let query = supabase
      .from('learning_paths')
      .select('id,title,description,progress_percent,module_count,topic_count,total_minutes,total_estimated_hours,metadata,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (typeof limit === 'number' && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch learning paths:', error);
      throw new Error(error.message || 'Failed to fetch learning paths');
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title || 'Untitled Path',
      description: row.description || '',
      progress: toNumber(row.progress_percent, 0),
      moduleCount: toNumber(row.module_count, 0),
      topicCount: toNumber(row.topic_count, 0),
      totalMinutes: toNumber(row.total_minutes, 0),
      totalEstimatedHours: toNumber(row.total_estimated_hours, 0),
      generationPreferences: extractGenerationPreferences(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async getLearningPathById(pathId: string): Promise<SavedLearningPathDetail | null> {
    if (!isConfigured()) {
      return null;
    }

    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('id', pathId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      if (error) {
        console.error('Failed to fetch learning path detail:', error);
      }
      return null;
    }

    return {
      id: data.id,
      title: data.title || 'Untitled Path',
      description: data.description || '',
      progress: toNumber(data.progress_percent, 0),
      moduleCount: toNumber(data.module_count, 0),
      topicCount: toNumber(data.topic_count, 0),
      totalMinutes: toNumber(data.total_minutes, 0),
      totalEstimatedHours: toNumber(data.total_estimated_hours, 0),
      generationPreferences: extractGenerationPreferences(data.metadata),
      educationLevel: data.education_level || 'school',
      modules: Array.isArray(data.modules) ? data.modules : [],
      sourceType: data.source_type || 'text',
      sourceInput: data.source_input || '',
      completedModuleIds: Array.isArray(data.completed_module_ids) ? data.completed_module_ids : [],
      currentModuleIndex: toNumber(data.current_module_index, 0),
      metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateLearningPathProgress(pathId: string, updates: {
    completedModuleIds: string[];
    currentModuleIndex: number;
    progressPercent: number;
  }): Promise<void> {
    if (!isConfigured()) {
      return;
    }

    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('learning_paths')
      .update({
        completed_module_ids: updates.completedModuleIds,
        current_module_index: Math.max(0, updates.currentModuleIndex),
        progress_percent: Math.max(0, Math.min(100, updates.progressPercent)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pathId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update learning path progress:', error);
      throw new Error(error.message || 'Failed to update learning path progress');
    }
  },

  async touchLearningPath(pathId: string): Promise<void> {
    if (!isConfigured()) {
      return;
    }

    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('learning_paths')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', pathId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to touch learning path:', error);
    }
  },

  async saveCodingAttempt(input: SaveCodingAttemptInput): Promise<void> {
    if (!isConfigured()) {
      return;
    }

    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('coding_attempts')
      .insert({
        user_id: userId,
        learning_path_id: input.learningPathId,
        module_id: input.moduleId,
        language: input.language,
        passed_count: Math.max(0, toNumber(input.passedCount, 0)),
        total_count: Math.max(0, toNumber(input.totalCount, 0)),
        status: input.status,
        metadata: input.metadata || {},
      });

    if (error) {
      console.error('Failed to save coding attempt:', error);
      throw new Error(error.message || 'Failed to save coding attempt');
    }
  },

  async listCodingAttempts(learningPathId: string, moduleId: string, limit = 20): Promise<CodingAttemptRecord[]> {
    if (!isConfigured()) {
      return [];
    }

    const userId = await getCurrentUserId();
    const safeLimit = Math.max(1, Math.min(100, limit));

    const { data, error } = await supabase
      .from('coding_attempts')
      .select('id,learning_path_id,module_id,language,passed_count,total_count,status,metadata,created_at')
      .eq('user_id', userId)
      .eq('learning_path_id', learningPathId)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      console.error('Failed to list coding attempts:', error);
      throw new Error(error.message || 'Failed to list coding attempts');
    }

    return (data || []).map((row) => ({
      id: row.id,
      learningPathId: row.learning_path_id,
      moduleId: row.module_id,
      language: row.language || 'python',
      passedCount: toNumber(row.passed_count, 0),
      totalCount: toNumber(row.total_count, 0),
      status: row.status || 'Attempted',
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
      createdAt: row.created_at,
    }));
  },

  async saveQuizAttempt(input: SaveQuizAttemptInput): Promise<void> {
    if (!isConfigured()) {
      return;
    }

    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        learning_path_id: input.learningPathId,
        module_id: input.moduleId,
        difficulty: input.difficulty,
        score: Math.max(0, toNumber(input.score, 0)),
        total: Math.max(0, toNumber(input.total, 0)),
        questions: input.questions || [],
      });

    if (error) {
      console.error('Failed to save quiz attempt:', error);
      throw new Error(error.message || 'Failed to save quiz attempt');
    }
  },

  async listQuizAttempts(
    learningPathId: string,
    moduleId: string,
    limit = 10,
  ): Promise<QuizAttemptDbRecord[]> {
    if (!isConfigured()) {
      return [];
    }

    const userId = await getCurrentUserId();
    const safeLimit = Math.max(1, Math.min(50, limit));

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('id,learning_path_id,module_id,difficulty,score,total,created_at,questions')
      .eq('user_id', userId)
      .eq('learning_path_id', learningPathId)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      console.error('Failed to list quiz attempts:', error);
      throw new Error(error.message || 'Failed to list quiz attempts');
    }

    return (data || []).map((row) => {
      // questions column stores { questions: QuizQuestion[], userAnswers: number[] }
      const stored = row.questions && typeof row.questions === 'object' && !Array.isArray(row.questions)
        ? (row.questions as { questions?: unknown[]; userAnswers?: unknown[] })
        : null;
      const qs = Array.isArray(stored?.questions) ? stored.questions as QuizAttemptDbRecord['questions'] : undefined;
      const ua = Array.isArray(stored?.userAnswers) ? (stored.userAnswers as number[]) : undefined;
      return {
        id: row.id,
        learningPathId: row.learning_path_id,
        moduleId: row.module_id,
        difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
        score: toNumber(row.score, 0),
        total: toNumber(row.total, 0),
        createdAt: row.created_at,
        questions: qs,
        userAnswers: ua,
      };
    });
  },

  /**
   * Initiates Google OAuth Login.
   * Simplifies options to reduce 403 errors.
   */
  async signInWithGoogle() {
    // Use just the origin for redirection (no path), because the app uses HashRouter.
    // Supabase appends tokens in the URL hash, which conflicts with HashRouter's hash-based routing.
    // The AuthCallbackHandler in App.tsx will handle navigating to the correct page after sign-in.
    // Ensure this URL is added to your Supabase Auth -> URL Configuration -> Redirect URLs.
    const redirectTo = window.location.origin;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
      }
    });
    if (error) throw error;
  },

  /**
   * Generates a structured learning path using Gemini API.
   */
  async generateLearningPath(source: string, audience: string) {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert curriculum designer. Generate a structured learning path for the following topic: "${source}". 
      Target audience: ${audience}. 
      Return a logical sequence of modules, each with specific subtopics.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  subtopics: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "title", "subtopics"]
              }
            }
          },
          required: ["title", "description", "modules"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate content");
    return JSON.parse(text);
  },

  /**
   * Logs out the user.
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }
};