
// Vite Environment Variables Type Declarations
interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface Module {
  id: string;
  title: string;
  completed: boolean;
  subtopics: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  progress: number;
  modules: Module[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}
