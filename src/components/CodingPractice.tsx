/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Terminal, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  Award,
  ChevronRight,
  Code2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Zap,
  ShieldCheck,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CodingPracticeProps {
  roadmapId: string;
  token: string;
  onBack: () => void;
  bookmarks: any[];
  onToggleBookmark: (bookmark: { type: string; targetId: string; title: string; subtitle: string }) => void;
  triggerToast?: (message: string, type: 'success' | 'error') => void;
}

export default function CodingPractice({ 
  roadmapId, 
  token, 
  onBack, 
  bookmarks, 
  onToggleBookmark,
  triggerToast
}: CodingPracticeProps) {
  // Session tracking states
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(0);
  const [sessionTotalTime, setSessionTotalTime] = useState(0);
  const [problemsAttempted, setProblemsAttempted] = useState<string[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Problems and session states
  const [stats, setStats] = useState<any>(null);
  const [activeProblem, setActiveProblem] = useState<any>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [error, setError] = useState('');

  // Editor states
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [overallStatus, setOverallStatus] = useState<'success' | 'fail' | null>(null);

  // Stats & Timing states
  const [sessionTime, setSessionTime] = useState(0);

  // Expand hints & solution
  const [expandedHints, setExpandedHints] = useState<boolean[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch stats and existing problems on mount / roadmap change
  useEffect(() => {
    fetchStats();
  }, [roadmapId]);

  // Handle active problem change or language change: load templates
  useEffect(() => {
    if (activeProblem) {
      loadTemplate(language);
      setTestResults([]);
      setTerminalOutput('');
      setOverallStatus(null);
      setShowSolution(false);
      setExpandedHints(new Array(activeProblem.hints?.length || 0).fill(false));
    }
  }, [activeProblem, language]);

  // Track elapsed seconds on the active problem
  useEffect(() => {
    let interval: any = null;
    if (activeProblem && !running && !submitting && overallStatus !== 'success') {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeProblem, running, submitting, overallStatus]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/coding/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch coding stats:', err);
    }
  };

  const fetchNextProblem = async () => {
    setNextLoading(true);
    setError('');
    setOverallStatus(null);
    setTerminalOutput('');
    setTestResults([]);

    // Reset active session counters on first problem load
    if (!sessionActive) {
      setSessionCorrect(0);
      setSessionWrong(0);
      setSessionSkipped(0);
      setSessionTotalTime(0);
      setProblemsAttempted([]);
    }

    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/coding/next`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setActiveProblem(data);
        setSessionTime(0);
        setSessionActive(true);
        fetchStats(); // Update stats in background
      } else {
        throw new Error(data.error || 'Failed to generate next algorithmic problem.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading next problem.');
    } finally {
      setNextLoading(false);
    }
  };

  const loadTemplate = (lang: string) => {
    if (!activeProblem) return;
    const cleanTitle = activeProblem.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const templates: { [key: string]: string } = {
      python: `def ${cleanTitle}(input_val):\n    # Write your Python 3 code here\n    # Read input_val and return output\n    return ""\n`,
      javascript: `function ${cleanTitle}(inputVal) {\n    // Write your JavaScript ES6 code here\n    // Return the correct output\n    return "";\n}\n`,
      java: `public class Solution {\n    public static String solve(String inputVal) {\n        // Write your Java 17 code here\n        return "";\n    }\n}\n`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nstring solve(string inputVal) {\n    // Write your C++ 20 code here\n    return "";\n}\n`
    };
    setCode(templates[lang] || templates['python']);
  };

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setRunning(true);
    setTerminalOutput('Compiling code & running against visible test cases...\n');
    setTestResults([]);
    setOverallStatus(null);

    const visibleTestCases = activeProblem.testCases.filter((tc: any) => !tc.isHidden);

    try {
      const response = await fetch('/api/sandbox/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          language,
          code,
          testCases: visibleTestCases
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Compiler runtime error.');

      if (data.error) {
        setTerminalOutput(`COMPILER ERROR:\n${data.error}`);
        setOverallStatus('fail');
      } else {
        setTestResults(data.testCaseResults || []);
        const passedAll = data.testCaseResults?.every((r: any) => r.passed);
        setOverallStatus(passedAll ? 'success' : 'fail');
        
        let out = 'RUN COMPLETE:\n';
        data.testCaseResults?.forEach((r: any, idx: number) => {
          out += `Test Case ${idx + 1}: ${r.passed ? 'PASSED ✓' : 'FAILED ✗'}\nInput: ${r.input}\nExpected: ${r.expectedOutput}\nActual: ${r.actualOutput}\n\n`;
        });
        setTerminalOutput(out);
      }
    } catch (err: any) {
      setTerminalOutput(`SYSTEM ERROR: ${err.message}`);
      setOverallStatus('fail');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!activeProblem) return;
    setSubmitting(true);
    setTerminalOutput('Submitting code for grading...\n');
    setTestResults([]);
    setOverallStatus(null);

    try {
      const response = await fetch('/api/sandbox/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: activeProblem.id,
          language,
          code,
          testCases: activeProblem.testCases,
          timeSpent: sessionTime,
          difficulty: activeProblem.difficulty
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Grading failed.');

      const report = data.report;
      if (report.error) {
        setTerminalOutput(`SUBMISSION FAILED (COMPILATION ERROR):\n${report.error}`);
        setOverallStatus('fail');
        setSessionWrong(prev => prev + 1);
      } else {
        setTestResults(report.testCaseResults || []);
        const passedAll = report.testCaseResults?.every((r: any) => r.passed);
        setOverallStatus(passedAll ? 'success' : 'fail');

        let out = `SUBMISSION STATUS: ${passedAll ? 'ACCEPTED (ALL TEST CASES PASSED!) 🎉' : 'REJECTED (SOME TEST CASES FAILED) ✗'}\n\n`;
        report.testCaseResults?.forEach((r: any, idx: number) => {
          out += `Test Case ${idx + 1}: ${r.passed ? 'PASSED ✓' : 'FAILED ✗'}\n`;
        });
        setTerminalOutput(out);

        if (passedAll) {
          setShowSolution(true);
          fetchStats(); // Update stats immediately in background
          
          if (!problemsAttempted.includes(activeProblem.id)) {
            setSessionCorrect(prev => prev + 1);
            setProblemsAttempted(prev => [...prev, activeProblem.id]);
          }
          setSessionTotalTime(prev => prev + sessionTime);
        } else {
          setSessionWrong(prev => prev + 1);
        }
      }
    } catch (err: any) {
      setTerminalOutput(`SUBMISSION ERROR: ${err.message}`);
      setOverallStatus('fail');
      setSessionWrong(prev => prev + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipProblem = async () => {
    if (!activeProblem) return;
    setNextLoading(true);
    try {
      await fetch('/api/sandbox/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problemId: activeProblem.id,
          language,
          code,
          timeSpent: sessionTime,
          difficulty: activeProblem.difficulty
        })
      });
      
      // Update session statistics for skipped problem
      setSessionSkipped(prev => prev + 1);
      setSessionTotalTime(prev => prev + sessionTime);
      
      await fetchNextProblem();
    } catch (err: any) {
      setError('Failed to skip: ' + err.message);
      setNextLoading(false);
    }
  };

  const isBookmarked = (id: string) => bookmarks.some(b => b.type === 'coding' && b.targetId === id);

  const formatTime = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // 1. Loading State
  if (nextLoading) {
    return (
      <div className="backdrop-blur-xl bg-slate-950 flex flex-col items-center justify-center min-h-screen text-center p-12">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
        </div>
        <h3 className="text-lg font-extrabold text-white animate-pulse">Consulting Gemini Expert</h3>
        <p className="text-xs text-indigo-400 font-bold mt-2 uppercase tracking-widest max-w-md leading-relaxed">
          Generating a completely unique challenge matching your roadmap and current difficulty level
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="backdrop-blur-xl bg-slate-950 flex flex-col items-center justify-center min-h-screen text-center p-8">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-4 max-w-md">
          <p className="text-rose-400 font-bold text-sm leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={fetchNextProblem}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Dynamic Generation</span>
        </button>
      </div>
    );
  }

  // 3. Lobby view when session is inactive
  if (!sessionActive) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100 p-8">
        <div className="max-w-4xl mx-auto w-full space-y-8 flex-1 flex flex-col justify-center">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                id="cp-exit-lobby-btn"
                className="cursor-pointer p-2.5 rounded-xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-white transition-all"
                title="Exit Coding Practice"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-white">Interactive Coding Practice</h1>
                <p className="text-xs text-slate-400 mt-1">Strengthen your programming skills with limitless customized challenges</p>
              </div>
            </div>
          </div>

          {/* Stats Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Stat: Current Rank / Difficulty */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skill Level</span>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {stats?.currentDifficultyLevel || 'Beginner'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Difficulty increases dynamically as you solve more problems.
                </p>
              </div>
            </div>

            {/* Stat: Problems Solved & Attempted */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exercises Completed</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {stats?.problemsSolved || 0} <span className="text-xs text-slate-500 font-medium">/ {stats?.problemsAttempted || 0} attempted</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Incorrect attempts logged: {stats?.incorrectAttempts || 0}
                </p>
              </div>
            </div>

            {/* Stat: Time Spent & Accuracy */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Practice Metrics</span>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {formatTime(stats?.timeSpent || 0)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Grader accuracy rate: <strong className="text-indigo-400">{stats?.accuracy || 0}%</strong>
                </p>
              </div>
            </div>

          </div>

          {/* Call to Action */}
          <div className="bg-slate-900/10 border border-slate-900 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center">
              <Code2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-md font-bold text-white">Ready to challenge yourself?</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Each challenge is unique. Solve it to level up your rank and unlock the next difficulty tier.
              </p>
            </div>
            <button
              onClick={fetchNextProblem}
              id="cp-start-practice-btn"
              className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 text-white font-extrabold text-xs px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/10 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Interactive Practice</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 4. Sandbox Screen Layout
  return (
    <div className="h-screen flex flex-col bg-slate-950 font-sans select-none text-slate-100">
      
      {/* Header bar */}
      <header className="flex-shrink-0 bg-slate-950 border-b border-slate-900 px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExitModal(true)}
            id="cp-exit-practice-btn"
            className="cursor-pointer px-3 py-1.5 rounded-xl border border-rose-950/40 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Exit Coding Practice"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Coding Practice</span>
          </button>
          
          <div className="h-4 w-px bg-slate-900" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-none">
                {activeProblem.title}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md border leading-none ${
                  activeProblem.difficulty === 'beginner' 
                    ? 'text-teal-400 bg-teal-500/10 border-teal-500/15'
                    : activeProblem.difficulty === 'easy' 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15'
                    : activeProblem.difficulty === 'medium'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/15'
                    : activeProblem.difficulty === 'hard'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/15'
                    : 'text-violet-400 bg-violet-500/10 border-violet-500/15'
                }`}>
                  {activeProblem.difficulty}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span>Time elapsed: {formatTime(sessionTime)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Sandbox Selector Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-900 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Lang:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-300 focus:outline-hidden cursor-pointer p-0"
            >
              <option value="python" className="bg-slate-950">Python 3</option>
              <option value="javascript" className="bg-slate-950">JavaScript ES6</option>
              <option value="java" className="bg-slate-950">Java 17</option>
              <option value="cpp" className="bg-slate-950">C++ 20</option>
            </select>
          </div>

          <button
            onClick={() => onToggleBookmark({
              type: 'coding',
              targetId: activeProblem.id,
              title: activeProblem.title,
              subtitle: 'Algorithmic Lab'
            })}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isBookmarked(activeProblem.id) 
                ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25' 
                : 'text-slate-500 bg-slate-900 border-slate-800 hover:text-slate-300'
            }`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        </div>
      </header>

      {/* Main Sandbox Panes */}
      <div className="flex-1 overflow-hidden flex">
        
        {/* Left Pane: Detailed problem information (40% width) */}
        <div className="w-[38%] border-r border-slate-900 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 space-y-6">
          
          {/* Main Statement */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Problem Description</h3>
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {activeProblem.problemStatement}
            </p>
          </div>

          {/* Formats Info */}
          <div className="grid grid-cols-1 gap-4 border-t border-slate-900 pt-5">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Input Specification:</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeProblem.inputFormat}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Output Specification:</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeProblem.outputFormat}</p>
            </div>
          </div>

          {/* Raw Sample Input / Output */}
          {(activeProblem.sampleInput || activeProblem.sampleOutput) && (
            <div className="border-t border-slate-900 pt-5 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Raw Sample Data:</h4>
              <div className="grid grid-cols-1 gap-3 font-mono text-[11px]">
                {activeProblem.sampleInput && (
                  <div className="bg-slate-900/30 border border-slate-900 p-3 rounded-xl">
                    <p className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-[9px]">Sample Input</p>
                    <pre className="text-slate-300 whitespace-pre-wrap">{activeProblem.sampleInput}</pre>
                  </div>
                )}
                {activeProblem.sampleOutput && (
                  <div className="bg-slate-900/30 border border-slate-900 p-3 rounded-xl">
                    <p className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-[9px]">Sample Output</p>
                    <pre className="text-slate-300 whitespace-pre-wrap">{activeProblem.sampleOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Core Constraints */}
          {activeProblem.constraints && activeProblem.constraints.length > 0 && (
            <div className="space-y-2 border-t border-slate-900 pt-5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Constraints:</h4>
              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                {activeProblem.constraints.map((c: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dynamic Examples */}
          {activeProblem.examples && activeProblem.examples.length > 0 && (
            <div className="space-y-3 border-t border-slate-900 pt-5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Illustrated Examples:</h4>
              <div className="space-y-4">
                {activeProblem.examples.map((ex: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/20 border border-slate-900 p-4 rounded-xl space-y-2.5">
                    <p className="text-[10px] font-bold text-indigo-400">Example {idx + 1}:</p>
                    <div className="font-mono text-[11px] space-y-1 border-l border-slate-800 pl-3">
                      <p><span className="text-slate-500 font-semibold">Input:</span> {ex.input}</p>
                      <p><span className="text-slate-500 font-semibold">Output:</span> {ex.output}</p>
                    </div>
                    {ex.explanation && (
                      <p className="text-[11px] text-slate-400 leading-relaxed italic border-t border-slate-900 pt-2.5 mt-2 font-sans">
                        <strong>Explanation:</strong> {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable progressive hints */}
          {activeProblem.hints && activeProblem.hints.length > 0 && (
            <div className="space-y-2 border-t border-slate-900 pt-5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Incremental Hints:</h4>
              <div className="space-y-2">
                {activeProblem.hints.map((hint: string, idx: number) => {
                  const isExp = expandedHints[idx];
                  return (
                    <div key={idx} className="bg-slate-900/10 border border-slate-900 rounded-xl overflow-hidden">
                      <button
                        onClick={() => {
                          const copy = [...expandedHints];
                          copy[idx] = !copy[idx];
                          setExpandedHints(copy);
                        }}
                        className="w-full text-left px-4 py-3 cursor-pointer hover:bg-slate-900/30 flex items-center justify-between text-xs font-bold text-slate-400 transition-colors"
                      >
                        <span>Hint {idx + 1}</span>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {isExp && (
                        <div className="p-4 border-t border-slate-900 text-xs text-slate-300 italic leading-relaxed bg-slate-900/5">
                          {hint}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gamified Solution explanation Walkthrough */}
          {showSolution && activeProblem.explanation && (
            <div className="space-y-2 border-t border-slate-900 pt-5">
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/15 rounded-xl p-3.5 text-left flex justify-between items-center text-xs font-bold text-indigo-400 transition-all cursor-pointer"
              >
                <span>Solution Walkthrough</span>
                {showSolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSolution && (
                <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {activeProblem.explanation}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Pane: Code Editor + Simulated Compiler Terminal Console (60% width) */}
        <div className="w-[62%] flex flex-col h-full overflow-hidden bg-slate-950">
          
          {/* Editor block */}
          <div className="flex-1 relative overflow-hidden bg-slate-950 min-h-[250px]">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-slate-950 text-slate-300 font-mono text-xs p-5 focus:outline-hidden resize-none whitespace-pre select-text leading-relaxed border-b border-slate-900 focus:ring-0"
              placeholder="// Write your code here..."
            />
            
            {/* Absolute editor actions overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-slate-900/90 border border-slate-800 hover:text-white hover:bg-slate-900 text-[10px] font-bold px-3 py-2 rounded-xl text-slate-400 transition-all cursor-pointer"
                  title="Reset Template"
                >
                  Reset Template
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-900/95 border border-rose-500/30 px-2.5 py-1.5 rounded-xl animate-pulse">
                  <span className="text-[10px] text-rose-400 font-bold">Reset template?</span>
                  <button
                    onClick={() => {
                      loadTemplate(language);
                      setShowResetConfirm(false);
                    }}
                    className="cursor-pointer text-[9px] bg-rose-600 hover:bg-rose-500 text-white font-black px-2 py-0.5 rounded transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="cursor-pointer text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-2 py-0.5 rounded transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Simulated Grader Terminal */}
          <div className="h-[42%] border-t border-slate-900 flex flex-col overflow-hidden bg-slate-950">
            
            {/* Terminal Header controls */}
            <div className="bg-slate-950 px-5 py-3 flex items-center justify-between border-b border-slate-900">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                <span>Compiler Standard outputs & test tracks</span>
              </span>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleRunCode}
                  disabled={running || submitting}
                  className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-[10px] rounded-xl transition-all"
                >
                  {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 text-blue-500" />}
                  <span>Run Code</span>
                </button>

                <button
                  onClick={handleSubmitCode}
                  disabled={running || submitting}
                  className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-extrabold text-[10px] rounded-xl transition-all shadow-md shadow-indigo-600/10"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Submit Attempt</span>
                </button>

                <div className="h-5 w-px bg-slate-900" />

                <button
                  onClick={handleSkipProblem}
                  disabled={running || submitting}
                  className="cursor-pointer flex items-center gap-1 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-300 font-bold text-[10px] rounded-xl transition-all"
                  title="Skip this challenge"
                >
                  <span>Skip Exercise</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Console Traces stdout */}
            <div className="flex-1 p-5 overflow-y-auto bg-slate-950 font-mono text-[11px] text-slate-300 leading-relaxed select-text whitespace-pre-wrap">
              {terminalOutput ? (
                <div className="space-y-4">
                  {overallStatus === 'success' && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <CheckCircle className="w-4 h-4" />
                        <span>GRADER STATUS: Accepted (Passed)! Flame Study Streak Extended!</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                        Excellent algorithm execution. The Solution walkthrough is now unlocked in the description panel.
                      </p>
                      <button
                        onClick={fetchNextProblem}
                        className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                      >
                        <span>Next Challenge</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {overallStatus === 'fail' && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <XCircle className="w-4 h-4" />
                        <span>GRADER STATUS: Rejected (Some test cases failed)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                        Traceback details are shown below. Modify your code above and re-submit to retry, or skip to the next challenge.
                      </p>
                    </div>
                  )}

                  <span className="text-slate-300 block bg-slate-900/20 p-3 rounded-xl border border-slate-900">{terminalOutput}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-1.5 py-6 text-center">
                  <ShieldCheck className="w-8 h-8 text-slate-700" />
                  <p className="italic">Sandbox is idle. Run visible test cases or submit standard compiler attempts.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Custom Exit Session Modal Overlay */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!exiting) setShowExitModal(false); }}
              className="absolute inset-0 bg-slate-950"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-900 bg-slate-900 p-6 text-left shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">End Practice Session?</h2>
                  <p className="text-xs text-slate-400 mt-1">Review your active session accomplishments below.</p>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="mt-6 bg-slate-950/60 border border-slate-900 rounded-xl p-4 space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Problems Solved:
                  </span>
                  <span className="font-extrabold text-white">{sessionCorrect}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    Failed Attempts:
                  </span>
                  <span className="font-extrabold text-white">{sessionWrong}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    Skipped:
                  </span>
                  <span className="font-extrabold text-white">{sessionSkipped}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Total Study Time:
                  </span>
                  <span className="font-extrabold text-white">
                    {formatTime(sessionTotalTime + (overallStatus !== 'success' ? sessionTime : 0))}
                  </span>
                </div>
                
                {/* Accuracy */}
                <div className="pt-2.5 border-t border-slate-900 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300">Session Accuracy:</span>
                  <span className={`${
                    sessionCorrect + sessionWrong === 0 
                      ? 'text-slate-400' 
                      : (sessionCorrect / (sessionCorrect + sessionWrong) >= 0.7)
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {sessionCorrect + sessionWrong === 0 
                      ? '0%' 
                      : `${Math.round((sessionCorrect / (sessionCorrect + sessionWrong)) * 100)}%`
                    }
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={exiting}
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl"
                >
                  Keep Practicing
                </button>
                <button
                  type="button"
                  disabled={exiting}
                  onClick={async () => {
                    setExiting(true);
                    try {
                      const finalTimeSpent = sessionTotalTime + (overallStatus !== 'success' ? sessionTime : 0);
                      
                      // Submit final session statistics to backend
                      await fetch('/api/sandbox/session/end', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          roadmapId,
                          correct: sessionCorrect,
                          wrong: sessionWrong,
                          skipped: sessionSkipped,
                          totalTimeSpent: finalTimeSpent
                        })
                      });

                      if (triggerToast) {
                        const accuracyStr = sessionCorrect + sessionWrong === 0 
                          ? '0%' 
                          : `${Math.round((sessionCorrect / (sessionCorrect + sessionWrong)) * 100)}%`;
                        
                        triggerToast(
                          `Session Summary: Solved ${sessionCorrect} | Accuracy ${accuracyStr} | Time ${formatTime(finalTimeSpent)}`,
                          'success'
                        );
                      }
                    } catch (err) {
                      console.error('Error completing coding practice session:', err);
                    } finally {
                      setExiting(false);
                      setShowExitModal(false);
                      // Instantly transition back to course page/dashboard
                      onBack();
                    }
                  }}
                  className="cursor-pointer px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/20"
                >
                  {exiting ? 'Exiting...' : 'Confirm & Exit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
