/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  Code, 
  Lightbulb, 
  AlertTriangle, 
  HelpCircle, 
  Copy, 
  Check, 
  Bookmark,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';

interface LessonViewProps {
  roadmapId: string;
  lessonId: string;
  token: string;
  onBack: () => void;
  bookmarks: any[];
  onToggleBookmark: (bookmark: { type: string; targetId: string; title: string; subtitle: string }) => void;
  onCompleteLesson: (lessonId: string) => void;
}

export default function LessonView({ 
  roadmapId, 
  lessonId, 
  token, 
  onBack, 
  bookmarks, 
  onToggleBookmark,
  onCompleteLesson 
}: LessonViewProps) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedInterviewIdx, setExpandedInterviewIdx] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchLessonDetails();
  }, [lessonId]);

  const fetchLessonDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/lessons/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLesson(data);
      } else {
        throw new Error(data.error || 'Failed to load lesson content.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while generating lesson content.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        onCompleteLesson(lessonId);
        setCompleted(true);
        setTimeout(() => {
          onBack();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const isBookmarked = bookmarks.some(b => b.type === 'lesson' && b.targetId === lessonId);

  // Parse simple Markdown paragraphs and bold markings
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n\n').map((para, pIdx) => {
      // Find bullet lists
      if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
        const items = para.split('\n').map(i => i.replace(/^[-*]\s+/, '').trim());
        return (
          <ul key={pIdx} className="list-disc pl-5 my-3 space-y-1.5 text-xs text-slate-300 leading-relaxed">
            {items.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatBoldCode(item) }} />
            ))}
          </ul>
        );
      }
      return (
        <p 
          key={pIdx} 
          className="text-xs text-slate-300 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatBoldCode(para) }}
        />
      );
    });
  };

  // Helper to formatting bold (**bold**) and inline code (`code`) in text
  const formatBoldCode = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-400 font-mono text-[11px] font-medium">$1</code>');
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/10 border border-slate-800/40 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[450px] text-center max-w-4xl mx-auto my-8">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
        </div>
        <h3 className="text-md font-extrabold text-white animate-pulse">Formulating Core Course Materials</h3>
        <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-widest">Generating detailed lessons, revision guides & templates</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center max-w-4xl mx-auto my-8">
        <p className="text-rose-400 font-bold mb-4">{error || 'Lesson failed to generate.'}</p>
        <button 
          onClick={fetchLessonDetails}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Generation</span>
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

        {/* Toggle Bookmark button */}
        <button
          onClick={() => onToggleBookmark({
            type: 'lesson',
            targetId: lessonId,
            title: lesson.title,
            subtitle: 'Mastery Content'
          })}
          className={`cursor-pointer p-2.5 rounded-xl border transition-all ${
            isBookmarked 
              ? 'text-blue-400 bg-blue-500/10 border-blue-500/25' 
              : 'text-slate-500 bg-slate-900 border-slate-800 hover:text-slate-300'
          }`}
          title="Bookmark Lesson"
        >
          <Bookmark className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Lesson details container */}
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{lesson.title}</h1>
          <div className="h-1 w-12 bg-blue-500 rounded-full mt-3" />
        </div>

        {/* Primary Explanation block */}
        <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl">
          <h2 className="text-md font-extrabold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Detailed Explanation</span>
          </h2>
          <div className="space-y-4">
            {renderMarkdown(lesson.explanation)}
          </div>
        </section>

        {/* Key Concepts and Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-sm font-extrabold text-white mb-3 tracking-wide">Key Learning Concepts</h2>
            <div className="flex flex-wrap gap-2">
              {lesson.keyConcepts?.map((c: string, idx: number) => (
                <span key={idx} className="bg-slate-950/80 text-blue-400 border border-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-lg">
                  {c}
                </span>
              ))}
            </div>
          </section>

          <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-sm font-extrabold text-white mb-3 tracking-wide">Core Key Takeaways</h2>
            <ul className="space-y-2">
              {lesson.keyPoints?.map((p: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Real World Examples */}
        {lesson.realWorldExamples && lesson.realWorldExamples.length > 0 && (
          <section className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white tracking-wide">Real-world Use Cases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.realWorldExamples.map((ex: string, idx: number) => (
                <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">{ex}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom Code Syntax blocks */}
        {lesson.codeExamples && lesson.codeExamples.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-md font-extrabold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              <span>Interactive Code Templates</span>
            </h2>
            <div className="space-y-6">
              {lesson.codeExamples.map((item: any, idx: number) => (
                <div key={idx} className="backdrop-blur-xl bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Code Block Header bar */}
                  <div className="bg-slate-900/80 border-b border-slate-850 px-4 py-2.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10">
                      {item.language || 'Code'}
                    </span>
                    <button
                      onClick={() => handleCopyCode(item.code, idx)}
                      className="cursor-pointer text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-850 transition-all flex items-center gap-1.5 text-[10px] font-bold"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Template</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Code text content */}
                  <div className="p-4 overflow-x-auto font-mono text-[11px] text-slate-300 bg-slate-950 leading-relaxed whitespace-pre select-text">
                    {item.code}
                  </div>

                  {/* Code context explanation */}
                  <div className="p-4 bg-slate-900/30 border-t border-slate-850">
                    <p className="text-xs text-slate-400 italic leading-relaxed">
                      <strong>Logic:</strong> {item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Best practices vs Common mistakes side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="backdrop-blur-xl bg-slate-900/30 border border-emerald-500/10 p-6 rounded-2xl">
            <h2 className="text-sm font-extrabold text-emerald-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Recommended Best Practices</span>
            </h2>
            <ul className="space-y-2">
              {lesson.bestPractices?.map((bp: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="backdrop-blur-xl bg-slate-900/30 border border-rose-500/10 p-6 rounded-2xl">
            <h2 className="text-sm font-extrabold text-rose-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Common Pitfalls to Avoid</span>
            </h2>
            <ul className="space-y-2">
              {lesson.commonMistakes?.map((cm: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>{cm}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Summary and Quick Revision note card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-sm font-extrabold text-white mb-2">Lesson Overview</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{lesson.summary}</p>
          </section>

          <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-sm font-extrabold text-white mb-2">Pre-Exam Revision Guide</h2>
            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{lesson.revisionNotes}</p>
          </section>
        </div>

        {/* Expandable Interview Questions Accordion */}
        {lesson.interviewQuestions && lesson.interviewQuestions.length > 0 && (
          <section className="backdrop-blur-xl bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Interview Readiness Prep</span>
            </h2>
            <div className="space-y-3">
              {lesson.interviewQuestions.map((q: string, idx: number) => {
                const isExpanded = expandedInterviewIdx === idx;
                return (
                  <div key={idx} className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedInterviewIdx(isExpanded ? null : idx)}
                      className="w-full text-left px-4 py-3 cursor-pointer hover:bg-slate-900/40 flex items-center justify-between text-xs font-bold text-slate-200 transition-colors"
                    >
                      <span>Q{idx + 1}: {q}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isExpanded && (
                      <div className="p-4 bg-slate-900/20 border-t border-slate-850 text-xs text-slate-400 leading-relaxed">
                        <p className="font-semibold text-white mb-1.5">Suggested Technical Solution:</p>
                        In a real tech panel assessment, explain the architectural implications, mention optimization strategies, and showcase your expertise by bringing in details from our code examples block.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Completion action Footer */}
        <div className="border-t border-slate-800/80 pt-6 flex justify-end">
          {completed ? (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-xl font-bold text-xs animate-bounce">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Lesson Complete! Extending Study Streak...</span>
            </div>
          ) : (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="cursor-pointer flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all"
            >
              {completing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Lesson Complete & Return</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
