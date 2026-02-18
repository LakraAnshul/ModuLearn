import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';
import { db } from '../lib/database.ts';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logo from '../components/logo.svg';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    
    try {
      // 1. Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (signUpError) {
         // Rate limit handling
         if (signUpError.message.includes('rate limit') || signUpError.status === 429) {
            throw new Error('Too many attempts. Please wait a moment before trying again.');
         }
         throw signUpError;
      }

      if (data?.user) {
        // 2. Check if we have a session.
        // If NO session, it means Email Confirmation is enabled and required.
        // We cannot create a profile yet because of RLS policies (we are not authenticated).
        if (!data.session) {
          setSuccessMessage("Account created successfully! Please check your email to verify your account.");
          setLoading(false);
          return;
        }

        // If we DO have a session (e.g. auto-confirm is on), we can create the profile.
        try {
          await db.saveProfile({
            fullName: formData.fullName,
            email: formData.email,
            onboarded: false
          }, data.user.id);
          
          navigate('/onboarding');
        } catch (profileErr: any) {
          console.error("Profile creation failed:", profileErr);
          // If profile creation fails but auth succeeded, we still consider them signed up.
          // They will be redirected to onboarding by AppLayout later anyway.
          navigate('/onboarding');
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      if (!successMessage) setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await db.signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa] dark:bg-zinc-950 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-transparent dark:border-zinc-800">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={logo} alt="ModuLearn" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold dark:text-white">ModuLearn</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Join the next generation of learners</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400">
            <div className="bg-emerald-100 dark:bg-emerald-800 p-1 rounded-full"><AlertCircle size={14} /></div>
            {successMessage}
          </div>
        )}

        {!successMessage && (
          <>
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
                  <span className="bg-[#fafafa] dark:bg-zinc-950 px-4 text-zinc-400">Or continue with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5 ml-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-peach/20 outline-none transition-all dark:text-white" 
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5 ml-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-peach/20 outline-none transition-all dark:text-white" 
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-peach/20 outline-none transition-all dark:text-white pr-12" 
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-peach/20 outline-none transition-all dark:text-white pr-12" 
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading || googleLoading}
                className="w-full bg-peach text-white py-4 rounded-xl font-bold shadow-lg shadow-peach/20 hover:opacity-90 transition-all mt-4 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Already have an account? <Link to="/login" className="text-zinc-900 dark:text-white font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;