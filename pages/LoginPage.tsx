import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseUrl } from '../lib/supabase.ts';
import { db } from '../lib/database.ts';
import { Loader2, AlertCircle, Eye, EyeOff, Settings } from 'lucide-react';
import logo from '../components/logo.svg';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const isConfigured = 
    supabaseUrl && 
    !supabaseUrl.includes('your-project-ref') && 
    !supabaseUrl.includes('placeholder');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfigured) {
      setError("Database not fully configured. Please check lib/supabase.ts");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fixed: Using v2 signInWithPassword
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (signInError) throw signInError;
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await db.signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa] dark:bg-zinc-950 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-transparent dark:border-zinc-800">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <img src={logo} alt="ModuLearn" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold dark:text-white">ModuLearn</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Sign in to continue your journey</p>
        </div>

        {!isConfigured && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl flex flex-col gap-2 text-amber-700 dark:text-amber-400 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-widest">
              <Settings size={14} /> Configuration Needed
            </div>
            <p>Please ensure your Supabase details are correctly set in <code>lib/supabase.ts</code>.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-4 mb-8">
          <button 
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-3.5 rounded-xl font-bold text-sm text-zinc-700 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-100 dark:border-zinc-800"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
              <span className="bg-[#fafafa] dark:bg-zinc-950 px-4 text-zinc-400">Or use email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-peach/20 outline-none transition-all dark:text-white" 
              placeholder="alex@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between mb-2 ml-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Password</label>
              <Link to="#" className="text-[10px] text-peach font-bold uppercase tracking-widest hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-peach/20 outline-none transition-all dark:text-white pr-12" 
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading || googleLoading}
            className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white py-5 rounded-xl font-bold shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Don't have an account? <Link to="/signup" className="text-peach font-bold hover:underline">Sign up for free</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;