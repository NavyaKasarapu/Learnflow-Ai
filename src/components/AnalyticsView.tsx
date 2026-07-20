/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  Award, 
  Calendar, 
  PlayCircle, 
  TrendingUp, 
  RefreshCw,
  Plus,
  Bookmark,
  CheckCircle,
  TrendingDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface AnalyticsViewProps {
  token: string;
}

export default function AnalyticsView({ token }: AnalyticsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Self Study Logging state variables
  const [logOpen, setLogOpen] = useState(false);
  const [minutes, setMinutes] = useState('30');
  const [activity, setActivity] = useState('');
  const [logging, setLogging] = useState(false);
  const [logMsg, setLogMsg] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (response.ok) {
        setData(resData);
      } else {
        throw new Error(resData.error || 'Failed to fetch learning stats.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.trim()) return;

    setLogging(true);
    setLogMsg('');

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actionType: 'self_study',
          details: `Self Study: ${activity.trim()} (${minutes} mins)`
        })
      });

      if (response.ok) {
        setLogMsg('Self-study activity logged successfully!');
        setActivity('');
        setLogOpen(false);
        // Refresh stats
        fetchAnalytics();
      } else {
        const d = await response.json();
        throw new Error(d.error || 'Failed to log activity.');
      }
    } catch (err: any) {
      setLogMsg(err.message || 'Error logging.');
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/10 border border-slate-800/40 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[450px] text-center max-w-4xl mx-auto my-8">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
        </div>
        <h3 className="text-md font-extrabold text-white animate-pulse">Running Deep Database Audit</h3>
        <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-widest">Aggregating timeline logs & performance indicators</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center max-w-4xl mx-auto my-8">
        <p className="text-rose-400 font-bold mb-4">{error || 'Analytics failed to compile.'}</p>
        <button 
          onClick={fetchAnalytics}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Compilation</span>
        </button>
      </div>
    );
  }

  // Formatting Weekly Study stats for Recharts
  const weeklyData = data.weeklyMinutes || [
    { name: 'Mon', minutes: 0 },
    { name: 'Tue', minutes: 0 },
    { name: 'Wed', minutes: 0 },
    { name: 'Thu', minutes: 0 },
    { name: 'Fri', minutes: 0 },
    { name: 'Sat', minutes: 0 },
    { name: 'Sun', minutes: 0 },
  ];

  // Formatting Quiz Accuracy stats for Recharts
  const accuracyHistory = data.accuracyHistory || [
    { index: 1, quiz: 75, coding: 60 },
    { index: 2, quiz: 80, coding: 80 },
    { index: 3, quiz: 90, coding: 85 },
  ];

  // Pie chart stats
  const totalL = data.totalLessonsCount || 0;
  const compL = data.completedLessonsCount || 0;
  const remL = Math.max(0, totalL - compL);

  const pieData = [
    { name: 'Completed Lessons', value: compL },
    { name: 'Remaining Lessons', value: remL || 1 } // prevent 0 value error
  ];
  const COLORS = ['#3b82f6', '#1e293b'];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Performance Matrix</h1>
            <p className="text-slate-400 text-xs mt-1">Syllabus completions, weekly focus minutes, quiz accuracies, and logs.</p>
          </div>
        </div>

        {/* Action log triggers */}
        <button
          onClick={() => { setLogOpen(true); setLogMsg(''); }}
          className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          <span>Log Self-Study</span>
        </button>
      </div>

      {/* Grid Quick Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Total Study Time</p>
            <h3 className="text-lg font-extrabold text-white mt-1">{data.totalStudyTimeMinutes || 0} mins</h3>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Quiz Accuracy</p>
            <h3 className="text-lg font-extrabold text-emerald-400 mt-1">{data.averageQuizAccuracyPercent || 0}%</h3>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Current Streak</p>
            <h3 className="text-lg font-extrabold text-white mt-1">{data.currentStreak || 0} days</h3>
          </div>
        </div>
      </div>

      {/* Graphs Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Weekly Minutes BarChart */}
        <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Weekly Learning Minutes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracies over time AreaChart */}
        <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Quiz & Coding Accuracies (%)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accuracyHistory}>
                <defs>
                  <linearGradient id="quizColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="codingColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="quiz" name="Quiz Score" stroke="#3b82f6" fillOpacity={1} fill="url(#quizColor)" strokeWidth={2} />
                <Area type="monotone" dataKey="coding" name="Coding Score" stroke="#818cf8" fillOpacity={1} fill="url(#codingColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Pie Chart */}
        <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Lesson Completion Ratio</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center flex-1 py-4">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-300 font-bold">Completed: {compL} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-800" />
                <span className="text-xs text-slate-400 font-semibold">Remaining: {remL} lessons</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strengthen topic hints */}
        <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Study Strength Summary</h2>
          <div className="bg-slate-950/60 border border-slate-850 p-4.5 rounded-xl space-y-3 flex-1 mt-4 flex flex-col justify-center">
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on your active roadmaps progress, you have completed <strong>{compL}</strong> lessons out of <strong>{totalL}</strong>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "Consistency is the bedrock of learning. Continue launching sandbox labs and taking adaptive quizzes to unlock detailed performance maps."
            </p>
          </div>
        </div>
      </div>

      {/* Manual Activity Logging modal popup */}
      <AnimatePresence>
        {logOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay background */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setLogOpen(false)} />
            
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md backdrop-blur-xl bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-extrabold text-white">Log External Study Activity</h3>
              <p className="text-xs text-slate-400">Did you read documentation or watch tutorial series? Log study minutes here to update analytics.</p>

              <form onSubmit={handleLogActivity} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Activity Duration (minutes)</label>
                  <select
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 cursor-pointer"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes (1 hour)</option>
                    <option value="120">120 Minutes (2 hours)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">What did you practice / read?</label>
                  <input
                    type="text"
                    required
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    placeholder="e.g. Read about Django middleware architectures"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLogOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={logging}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    {logging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Record Activity</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
