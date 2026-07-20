/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Mail, GraduationCap, Target, RefreshCw, CheckCircle, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileViewProps {
  user: any;
  profile: any;
  token: string;
  onProfileUpdate: (updatedUser: any, updatedProfile: any) => void;
}

export default function ProfileView({ user, profile, token, onProfileUpdate }: ProfileViewProps) {
  const [name, setName] = useState(user?.name || '');
  const [education, setEducation] = useState(profile?.education || 'University Student');
  const [skillLevel, setSkillLevel] = useState(profile?.skillLevel || 'beginner');
  const [learningGoal, setLearningGoal] = useState(profile?.learningGoal || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.name || 'Learn');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Generate avatar URL from seed
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`;

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          education,
          skillLevel,
          learningGoal,
          avatarUrl
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile.');

      onProfileUpdate(data.user, data.profile);
      setMessage('Profile settings updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleShuffleAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
  };

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Profile Settings</h1>
        <p className="text-slate-400 text-xs mt-1">Configure your personalized learning goal, education, avatar, and system credentials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left: Avatar Customize Card */}
        <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">AI Companion Avatar</h3>
          
          <div className="relative">
            <img 
              src={avatarUrl} 
              alt="Profile Avatar" 
              className="w-28 h-28 rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-inner"
            />
          </div>

          <div className="space-y-2 w-full">
            <input
              type="text"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              placeholder="Avatar Seed text"
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs font-mono text-center text-slate-300 focus:outline-hidden"
            />
            
            <button
              onClick={handleShuffleAvatar}
              className="cursor-pointer w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold py-2 rounded-xl text-slate-300 flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Shuffle Design</span>
            </button>
          </div>
        </div>

        {/* Right: Update Form (2 cols) */}
        <div className="md:col-span-2">
          <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl shadow-xl">
            
            {message && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Display Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Education Background</label>
                  <input
                    type="text"
                    required
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Skill Level</label>
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 cursor-pointer focus:outline-hidden"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">System Email (ReadOnly)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'user@example.com'}
                      className="w-full bg-slate-950/40 border border-slate-900 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Core Learning Goal</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Target className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="e.g. Pass my cloud security exam, become a robust backend dev"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/15"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Save Profile Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
