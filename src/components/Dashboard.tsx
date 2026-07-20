/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  RefreshCw,
  Search,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  onSelectRoadmap: (roadmap: any) => void;
  token: string;
}

export default function Dashboard({ onSelectRoadmap, token }: DashboardProps) {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Custom rotating AI status messages for the generation screen
  const [statusMessageIdx, setStatusMessageIdx] = useState(0);
  const statusMessages = [
    'Parsing your request topic and researching pedagogy...',
    'Formulating modular learning benchmarks from beginner to advanced...',
    'Structuring sequential lessons for maximum conceptual clarity...',
    'Constructing realistic practice coding sandbox structures...',
    'Validating roadmap flow against cognitive load standards...',
    'Saving customized syllabus to persistent cloud databases...',
    'Personalization complete! Preparing your custom dashboard view...'
  ];

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        setStatusMessageIdx((prev) => (prev + 1) % statusMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [generating]);

  const fetchRoadmaps = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/roadmaps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRoadmaps(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setError('');
    setGenerating(true);
    setStatusMessageIdx(0);

    try {
      const response = await fetch('/api/roadmaps/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: topic.trim(), difficulty }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate roadmap.');

      setTopic('');
      setRoadmaps((prev) => [data, ...prev]);
      // Immediately open the newly generated roadmap
      onSelectRoadmap(data);
    } catch (err: any) {
      setError(err.message || 'AI generation failed. Please try a different topic.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/roadmaps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRoadmaps((prev) => prev.filter(r => r.id !== id));
        setToast({ message: 'Roadmap and all related progress successfully deleted!', type: 'success' });
        setTimeout(() => setToast(null), 4000);
      } else {
        throw new Error(data.error || 'Failed to delete roadmap.');
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Error occurred while deleting the roadmap.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans select-none text-slate-100 relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            ) : (
              <Trash2 className="w-4 h-4 text-rose-400 animate-pulse" />
            )}
            <span className="text-xs font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with user streak / notification badge */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Learning Hub</h1>
          <p className="text-slate-400 text-xs mt-1">
            Generate customized pedagogical tracks, lessons, quizzes, and coding sandboxes instantly.
          </p>
        </div>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Generate roadmap form */}
        <div className="lg:col-span-1">
          <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl sticky top-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
              <h2 className="text-lg font-extrabold text-white">Generate Custom AI Syllabus</h2>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">
              Enter any technical or non-technical topic. Our Google Gemini 2.5 Flash model will formulate modules, sequence benchmarks, and design lessons.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">What do you want to learn?</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={generating}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Python OOP, AWS Lambda, Docker..."
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-0 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Syllabus Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      disabled={generating}
                      onClick={() => setDifficulty(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        difficulty === lvl
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !topic.trim()}
                className="w-full cursor-pointer mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 transition-all"
              >
                <span>Formulate Learning Roadmap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active roadmaps list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Active Syllabi / Roadmaps ({roadmaps.length})</span>
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center"
              >
                {/* Custom animated glowing loader circles */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-indigo-500 animate-spin" />
                </div>
                
                <h3 className="text-md font-extrabold text-white animate-pulse">Personalizing Your Roadmap</h3>
                <p className="text-xs text-blue-400 font-semibold mt-1 tracking-wider uppercase">Google Gemini AI Flash 2.5</p>
                
                {/* Dynamically rotating AI progress message */}
                <div className="mt-6 bg-slate-950/60 border border-slate-800/60 px-4 py-2.5 rounded-xl max-w-sm">
                  <p className="text-[11px] text-slate-300 italic">
                    "{statusMessages[statusMessageIdx]}"
                  </p>
                </div>
              </motion.div>
            ) : loading ? (
              // Loading Skeleton loader list
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded-lg w-1/3" />
                    <div className="h-3 bg-slate-800 rounded-lg w-2/3" />
                    <div className="flex gap-4">
                      <div className="h-3 bg-slate-800 rounded-lg w-1/4" />
                      <div className="h-3 bg-slate-800 rounded-lg w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : roadmaps.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="backdrop-blur-xl bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center text-slate-500"
              >
                <BookMarked className="w-12 h-12 text-slate-700 mb-4" />
                <h3 className="text-sm font-extrabold text-slate-300">No Learning Roadmap Generated Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Enter any topic (e.g. AWS Cloud Development, Kotlin Android, Data Structures) on the left to start your custom curriculum journey!
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {roadmaps.map((r, idx) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelectRoadmap(r)}
                    className="group border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700/80 rounded-2xl p-6 cursor-pointer shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/15">
                            {r.topic}
                          </span>
                          <h3 className="text-lg font-extrabold text-white mt-3 group-hover:text-blue-400 transition-colors">
                            {r.title}
                          </h3>
                        </div>
                        
                        {/* Delete button */}
                        <div onClick={(e) => e.stopPropagation()} className="relative z-10">
                          {deletingId !== r.id ? (
                            <button
                              onClick={() => setDeletingId(r.id)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                              title="Delete Syllabus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-slate-950 border border-rose-500/20 px-2.5 py-1 rounded-xl animate-pulse">
                              <span className="text-[10px] text-rose-400 font-extrabold">Delete?</span>
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="cursor-pointer text-[9px] bg-rose-600 hover:bg-rose-500 text-white font-black px-2 py-0.5 rounded transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="cursor-pointer text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-2 py-0.5 rounded transition-colors"
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>

                      <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-800 px-2.5 py-1 rounded-lg">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{r.modules?.length || 0} Modules</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-800 px-2.5 py-1 rounded-lg capitalize">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                          <span>{r.difficulty}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-800 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{r.estimatedDuration}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress tracking section */}
                    <div className="mt-5 border-t border-slate-850 pt-4">
                      <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                        <span className="font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Learning Progress</span>
                        </span>
                        <span className="font-bold text-white">{r.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-900 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${r.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
