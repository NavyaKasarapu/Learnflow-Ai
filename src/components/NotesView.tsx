/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  BookOpen, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Award,
  BookMarked,
  Lightbulb,
  Zap,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface NotesViewProps {
  roadmapId: string;
  lessonId: string;
  token: string;
  onBack: () => void;
  bookmarks: any[];
  onToggleBookmark: (bookmark: { type: string; targetId: string; title: string; subtitle: string }) => void;
}

export default function NotesView({ 
  roadmapId, 
  lessonId, 
  token, 
  onBack, 
  bookmarks, 
  onToggleBookmark 
}: NotesViewProps) {
  const [notes, setNotes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchNotesDetails();
  }, [lessonId]);

  const fetchNotesDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/lessons/${lessonId}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotes(data);
      } else {
        throw new Error(data.error || 'Failed to load study notes.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while generating notes.');
    } finally {
      setLoading(false);
    }
  };

  const isBookmarked = bookmarks.some(b => b.type === 'note' && b.targetId === lessonId);

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/10 border border-slate-800/40 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[450px] text-center max-w-4xl mx-auto my-8">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
        </div>
        <h3 className="text-md font-extrabold text-white animate-pulse">Assembling Smart Study Booklets</h3>
        <p className="text-xs text-indigo-400 font-bold mt-1 uppercase tracking-widest">Compiling definitions, FAQ logs & structured revision index</p>
      </div>
    );
  }

  if (error || !notes) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center max-w-4xl mx-auto my-8">
        <p className="text-rose-400 font-bold mb-4">{error || 'Notes failed to generate.'}</p>
        <button 
          onClick={fetchNotesDetails}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Compilation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="cursor-pointer group flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Syllabus</span>
        </button>

        {/* Toggle notes bookmark */}
        <button
          onClick={() => onToggleBookmark({
            type: 'note',
            targetId: lessonId,
            title: notes.title,
            subtitle: 'AI Study Booklet'
          })}
          className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
            isBookmarked 
              ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25' 
              : 'text-slate-500 bg-slate-900 border-slate-800 hover:text-slate-300'
          }`}
          title="Bookmark Notes"
        >
          <Bookmark className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Title info */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-2xl">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest font-extrabold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded-md">
            Study Booklet
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1 tracking-tight">{notes.title}</h1>
        </div>
      </div>

      {/* Definitions row */}
      {notes.definitions && notes.definitions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-400" />
            <span>Glossary / Key Definitions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.definitions.map((def: any, idx: number) => (
              <div key={idx} className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-4.5 rounded-2xl hover:border-slate-700/80 transition-all">
                <h3 className="text-xs font-bold text-white mb-1.5 border-b border-slate-850 pb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{def.term}</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{def.definition}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detailed deeper mechanics */}
      {notes.detailedExplanation && (
        <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl">
          <h2 className="text-md font-extrabold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Conceptual Deep Dive</span>
          </h2>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-4">
            {notes.detailedExplanation}
          </div>
        </section>
      )}

      {/* Important takeaways and points */}
      {notes.importantPoints && notes.importantPoints.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Crucial Study highlights</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {notes.importantPoints.map((pt: string, idx: number) => (
              <div key={idx} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-start gap-3">
                <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5 flex-shrink-0">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{pt}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expandable FAQs Accordion */}
      {notes.faq && notes.faq.length > 0 && (
        <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <HelpCircle className="w-4.5 h-4.5 text-indigo-400" />
            <span>Frequently Asked Questions (FAQ)</span>
          </h2>
          <div className="space-y-3">
            {notes.faq.map((item: any, idx: number) => {
              const isExpanded = expandedFaqIdx === idx;
              return (
                <div key={idx} className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                    className="w-full text-left px-4 py-3 cursor-pointer hover:bg-slate-900/40 flex items-center justify-between text-xs font-bold text-slate-200 transition-colors"
                  >
                    <span>{item.question}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {isExpanded && (
                    <div className="p-4 bg-slate-900/20 border-t border-slate-850 text-xs text-slate-400 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Interview Prep section */}
      {notes.interviewQuestions && notes.interviewQuestions.length > 0 && (
        <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-indigo-400" />
            <span>Interview Preparation Log</span>
          </h2>
          <div className="space-y-4">
            {notes.interviewQuestions.map((q: string, idx: number) => (
              <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-md mt-0.5">
                    Question
                  </span>
                  <p className="text-xs font-bold text-slate-200">{q}</p>
                </div>
                <div className="text-xs text-slate-400 pl-[75px] leading-relaxed italic border-l border-slate-850">
                  <strong>Ideal Answer Strategy:</strong> Use standard technical vocabulary from this notes guide, state definitions clearly, explain code optimization, and discuss real-world edge cases.
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
