/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface RecommendationsViewProps {
  token: string;
  onSelectRecommendedLesson: (roadmapId: string, lessonId: string) => void;
}

export default function RecommendationsView({ token, onSelectRecommendedLesson }: RecommendationsViewProps) {
  const [rec, setRec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/recommendations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRec(data);
      } else {
        throw new Error(data.error || 'Failed to fetch recommendations.');
      }
    } catch (err: any) {
      setError(err.message || 'Error compiling custom suggestions.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/10 border border-slate-800/40 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[450px] text-center max-w-4xl mx-auto my-8">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
        </div>
        <h3 className="text-md font-extrabold text-white animate-pulse">Running Deep Analytics</h3>
        <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-widest">Aggregating quiz logs, sandbox code metrics & focus streaks</p>
      </div>
    );
  }

  if (error || !rec) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center max-w-4xl mx-auto my-8">
        <p className="text-rose-400 font-bold mb-4">{error || 'Recommendations failed to load.'}</p>
        <button 
          onClick={fetchRecommendations}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Compilation</span>
        </button>
      </div>
    );
  }

  // Handle empty state (no history/roadmaps)
  const hasRoadmaps = rec.recommendedLessons && rec.recommendedLessons.length > 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Insights</h1>
            <p className="text-slate-400 text-xs mt-1">Smart, pedagogical suggestions computed from your quiz accuracy and coding sandbox telemetry.</p>
          </div>
        </div>
      </div>

      {!hasRoadmaps ? (
        <div className="backdrop-blur-xl bg-slate-900/15 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[300px]">
          <Brain className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-sm font-extrabold text-slate-300 font-sans">Awaiting Sufficient Learning Logs</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Generate your first syllabus roadmap, and complete some lessons or interactive quizzes. Our AI models will then map out custom recommendations for you!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Quick analysis cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Strong Topics */}
            <div className="backdrop-blur-xl bg-slate-900/30 border border-emerald-500/10 p-6 rounded-2xl">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Verified Strengths</span>
              </h2>
              {rec.strongTopics && rec.strongTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {rec.strongTopics.map((topic: string, idx: number) => (
                    <span key={idx} className="bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Achieve high quiz score accuracy to register strengths.</p>
              )}
            </div>

            {/* Weak Topics */}
            <div className="backdrop-blur-xl bg-slate-900/30 border border-rose-500/10 p-6 rounded-2xl">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-rose-400 mb-4 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Targeted Revision Focus</span>
              </h2>
              {rec.weakTopics && rec.weakTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {rec.weakTopics.map((topic: string, idx: number) => (
                    <span key={idx} className="bg-rose-500/5 text-rose-400 border border-rose-500/10 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-500 font-semibold">Perfect marks registered so far! No revision topics needed.</p>
              )}
            </div>
          </div>

          {/* Actionable Lessons Suggestions list */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Personalized Review Routes</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rec.recommendedLessons.map((item: any) => (
                <div
                  key={item.lessonId}
                  onClick={() => onSelectRecommendedLesson(item.roadmapId, item.lessonId)}
                  className="group cursor-pointer border border-slate-850 bg-slate-900/30 hover:bg-slate-900/60 hover:border-blue-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all"
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 border border-blue-500/15 rounded-md">
                      Recommended Study
                    </span>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors mt-3">
                      {item.lessonTitle}
                    </h3>
                    <p className="text-slate-500 text-[10px] mt-1 italic">
                      Reason: {item.reason}
                    </p>
                  </div>

                  <div className="flex justify-end border-t border-slate-850/60 pt-3.5 mt-4">
                    <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                      <span>Review Lesson</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
