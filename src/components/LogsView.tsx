/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { History, Award, BookOpen, Flame, PlusCircle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface LogsViewProps {
  token: string;
}

export default function LogsView({ token }: LogsViewProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLogs(data);
      } else {
        throw new Error(data.error || 'Failed to load activity logs.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'roadmap_gen_start':
      case 'generate_roadmap': return <Zap className="w-4 h-4 text-indigo-400" />;
      case 'complete_lesson': return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'take_quiz':
      case 'quiz_submit': return <Award className="w-4 h-4 text-amber-400" />;
      case 'coding_practice':
      case 'code_submit': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'self_study': return <PlusCircle className="w-4 h-4 text-purple-400" />;
      default: return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLogLabel = (type: string) => {
    if (!type) return 'Activity';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/10 border border-slate-800/40 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[450px] text-center max-w-4xl mx-auto my-8">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
        </div>
        <h3 className="text-md font-extrabold text-white animate-pulse">Consulting Learning Logbooks</h3>
        <p className="text-xs text-indigo-400 font-bold mt-1 uppercase tracking-widest">Constructing chronological study history</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Study History Logs</h1>
            <p className="text-slate-400 text-xs mt-1">Chronological logbook of your curriculum, quizzes, coding submissions, and milestones.</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-white cursor-pointer transition-all"
          title="Refresh History"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="backdrop-blur-xl bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[300px]">
          <History className="w-12 h-12 text-slate-800 mb-3" />
          <h3 className="text-sm font-extrabold text-slate-300">Activity Ledger is Empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Activities (lessons completed, roadmaps formulated, sandbox submits) will list chronologically in a timeline ledger once you begin.
          </p>
        </div>
      ) : (
        <div className="space-y-6 relative border-l border-slate-900 ml-4.5 pl-6.5 py-2">
          {logs.map((log) => (
            <div key={log.id} className="relative space-y-1.5">
              
              {/* Vertical timeline bubble dot absolute placement */}
              <span className="absolute -left-[38px] top-1.5 p-1.5 bg-slate-950 border border-slate-900 rounded-full flex items-center justify-center z-10 shadow-lg">
                {getLogIcon(log.action)}
              </span>

              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  {new Date(log.createdAt || log.timestamp).toLocaleString()}
                </span>
                
                <span className="text-[9px] uppercase tracking-widest font-extrabold bg-slate-900 border border-slate-850 px-2.5 py-0.5 rounded text-slate-400">
                  {getLogLabel(log.action)}
                </span>
              </div>

              <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-850 p-4 rounded-xl">
                <p className="text-xs font-bold text-slate-200">{log.details}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
