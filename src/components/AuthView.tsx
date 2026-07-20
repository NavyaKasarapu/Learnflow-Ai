/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, User, GraduationCap, Flame, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthViewProps {
  onAuthSuccess: (token: string, user: any, profile: any) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [isReset, setIsReset] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const validateEmail = (emailStr: string) => {
    return /\S+@\S+\.\S+/.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isForgot && !isReset && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isReset) {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Password reset failed.');
        setMessage('Password reset successfully! You can now log in.');
        setIsReset(false);
        setIsLogin(true);
      } else if (isForgot) {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to request reset.');
        setMessage('Reset link simulated! In a real app, an email would be sent. You can now reset your password.');
        setIsForgot(false);
        setIsReset(true);
      } else if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Invalid credentials.');
        onAuthSuccess(data.token, data.user, data.profile);
      } else {
        if (!name.trim()) {
          setError('Name is required for registration.');
          setLoading(false);
          return;
        }
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed.');
        onAuthSuccess(data.token, data.user, data.profile);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-12 relative overflow-hidden font-sans select-none">
      {/* Decorative blurred backdrop glow elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Title / Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 tracking-wider uppercase">Personalized Learning Platform</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Learn<span className="text-blue-500">Flow</span> AI
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Generate customized roadmaps, lessons, and adaptive coding sandboxes in seconds.
          </p>
        </div>

        {/* Card Panel (Glassmorphic design) */}
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative">
          
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              {isForgot ? 'Reset Password' : isReset ? 'Set New Password' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isForgot 
                ? 'Enter your email to simulate a password recovery process.' 
                : isReset 
                ? 'Create a secure new password for your LearnFlow AI account.' 
                : isLogin 
                ? 'Log in to continue your personalized learning journey.' 
                : 'Enter your details to generate your customized AI learning path.'}
            </p>
          </div>

          {/* Feedback alerts */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
            >
              {message}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name Input (Register only) */}
            {!isLogin && !isForgot && !isReset && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            {!isReset && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password Input (Login/Register) */}
            {isLogin && !isForgot && !isReset && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsForgot(true); setError(''); setMessage(''); }}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {!isLogin && !isForgot && !isReset && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* New Password (Reset Mode) */}
            {isReset && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 mt-6"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {isForgot ? 'Simulate Password Reset' : isReset ? 'Update Password' : isLogin ? 'Sign In to LearnFlow' : 'Generate Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isForgot || isReset ? (
              <button 
                onClick={() => { setIsForgot(false); setIsReset(false); setIsLogin(true); setError(''); setMessage(''); }}
                className="text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
              >
                Back to Login
              </button>
            ) : isLogin ? (
              <span>
                Don't have an account?{' '}
                <button 
                  onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button 
                  onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
                >
                  Log In
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Sandbox Credentials Indicator / Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
          <span>All connections are fully secured via SHA-256 JWT sessions.</span>
        </div>
      </motion.div>
    </div>
  );
}
