import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase.ts';
import { db } from './lib/database.ts';
import { Loader2 } from 'lucide-react';
import LandingPage from './pages/LandingPage.tsx';
import FeaturesPage from './pages/FeaturesPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import OnboardingPage from './pages/OnboardingPage.tsx';
import Dashboard from './pages/app/Dashboard.tsx';
import CreatePath from './pages/app/CreatePath.tsx';
import StructurePath from './pages/app/StructurePath.tsx';
import LearningInterface from './pages/app/LearningInterface.tsx';
import ProgressPage from './pages/app/ProgressPage.tsx';
import SettingsPage from './pages/app/SettingsPage.tsx';
import AppLayout from './components/app/AppLayout.tsx';

// ─── OAuth code capture ────────────────────────────────────────────────
// Grab the ?code= ONCE at module-load time (before React mounts at all).
// This is critical because React.StrictMode double-fires effects, and if
// we read window.location.search inside a useEffect, the first run cleans
// the URL and the second run sees nothing → user lands on the wrong page.
// ────────────────────────────────────────────────────────────────────────
const _initialParams = new URLSearchParams(window.location.search);
const _oauthCode: string | null = _initialParams.get('code');

// If there's a code, clean it from the URL immediately so it can't be
// consumed a second time (e.g. on accidental refresh).
if (_oauthCode) {
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
}

// This promise resolves once the OAuth exchange is done (or immediately if
// there's no code). Components await it to know when routing is safe.
let _oauthReady: Promise<void>;
if (_oauthCode) {
  _oauthReady = (async () => {
    try {
      console.log('[Auth] OAuth callback detected, exchanging PKCE code…');
      const { data, error } = await supabase.auth.exchangeCodeForSession(_oauthCode);

      if (error) {
        console.error('[Auth] Code exchange failed:', error.message);
        window.location.hash = '/login';
        return;
      }

      if (data.session) {
        console.log('[Auth] Session established, checking profile…');
        try {
          const profile = await db.getProfile();
          if (profile?.onboarded) {
            console.log('[Auth] User onboarded → routing to #/app');
            window.location.hash = '/app';
          } else {
            // Profile row exists but user hasn't finished onboarding.
            // Ensure the name from Google is saved.
            if (profile && !profile.fullName) {
              try { await db.saveProfile({ onboarded: false }); } catch {}
            }
            console.log('[Auth] User NOT onboarded → routing to #/onboarding');
            window.location.hash = '/onboarding';
          }
        } catch {
          // No profile row at all → create one with Google name + email
          console.log('[Auth] No profile found, creating initial profile…');
          try { await db.saveProfile({ onboarded: false }); } catch {}
          console.log('[Auth] → routing to #/onboarding');
          window.location.hash = '/onboarding';
        }
      } else {
        console.error('[Auth] No session returned');
        window.location.hash = '/login';
      }
    } catch (err) {
      console.error('[Auth] OAuth callback error:', err);
      window.location.hash = '/login';
    }
  })();
} else {
  _oauthReady = Promise.resolve();
}

const App: React.FC = () => {
  const [ready, setReady] = useState(!_oauthCode); // true immediately when no OAuth

  useEffect(() => {
    // If there was an OAuth code, wait for the module-level exchange to finish
    if (!ready) {
      _oauthReady.then(() => setReady(true));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <Loader2 className="animate-spin text-orange-400" size={40} />
        <p className="text-zinc-400 text-sm font-medium">Signing you in…</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected App Routes (Wrapped in Sidebar Layout) */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="create" element={<CreatePath />} />
          <Route path="structure" element={<StructurePath />} />
          <Route path="path/:id" element={<LearningInterface />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;