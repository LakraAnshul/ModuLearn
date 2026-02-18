import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Initialization
 */

export const supabaseUrl = 
  (process.env as any).SUPABASE_URL || 
  (window as any).SUPABASE_URL || 
  'https://fguwbwndduxkcaisccgs.supabase.co';

export const supabaseAnonKey = 
  (process.env as any).SUPABASE_ANON_KEY || 
  (window as any).SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndXdid25kZHV4a2NhaXNjY2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk1NjAsImV4cCI6MjA4NjExNTU2MH0.bc7FpZmbGbxuC9QG0TQqw59iSt3d_dFmcP5ImSG_dng';

const finalUrl = supabaseUrl && supabaseUrl !== '' ? supabaseUrl : 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey && supabaseAnonKey !== '' ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    // PKCE flow sends the auth code as a query param (?code=xxx) instead of
    // in the URL hash (#access_token=xxx). This is critical because the app
    // uses HashRouter, which would overwrite the hash before Supabase can
    // read the tokens, breaking the OAuth flow entirely.
    flowType: 'pkce',
    // We handle the ?code= exchange explicitly in AuthCallbackHandler (App.tsx)
    // to avoid race conditions between Supabase's auto-detection and React mounting.
    detectSessionInUrl: false,
    autoRefreshToken: true,
  }
});
