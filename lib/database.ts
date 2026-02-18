import { supabase, supabaseUrl } from './supabase.ts';
import { GoogleGenAI, Type } from "@google/genai";

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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const isConfigured = () => 
  supabaseUrl && 
  !supabaseUrl.includes('your-project-ref') && 
  !supabaseUrl.includes('placeholder');

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