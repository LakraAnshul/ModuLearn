/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_BIODIGITAL_DEVELOPER_KEY: string;
  readonly VITE_BIODIGITAL_VIEWER_BASE_URL?: string;
  readonly VITE_BIODIGITAL_DEFAULT_MODEL_ID?: string;
  readonly VITE_BIODIGITAL_TOPIC_MODEL_MAP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'jsmind';
declare module 'jsmind/style/jsmind.css';
