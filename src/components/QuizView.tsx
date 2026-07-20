/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  Percent,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizViewProps {
  roadmapId: string;
  lessonId: string;
  token: string;
  onBack: () => void;
}

export default function QuizView({ roadmapId, lessonId, token, onBack }: QuizViewProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quiz active game states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  
  // Timer states
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete state
  const [quizFinished, setQuizFinished] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);

  useEffect(() => {
    fetchQuizQuestions();
    
    // Start stopwatch
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lessonId]);

  const fetchQuizQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/lessons/${lessonId}/quiz`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setQuestions(data);
      } else {
        throw new Error(data.error || 'Failed to load quiz.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while generating quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionIdx: number) => {
    if (answered) return;
    setSelectedIdx(optionIdx);
    setAnswered(true);

    const isCorrect = optionIdx === questions[currentIdx].correctOptionIndex;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedIdx(null);
      setAnswered(false);
    } else {
      // Quiz finished, stop timer and submit results
      if (timerRef.current) clearInterval(timerRef.current);
      submitResults();
    }
  };

  const submitResults = async () => {
    setSavingAttempt(true);
    setQuizFinished(true);

    try {
      await fetch(`/api/roadmaps/${roadmapId}/lessons/${lessonId}/quiz/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          correct: correctCount,
          wrong: wrongCount + (answered ? 0 : 1), // Handle unanswered last question safely
          timeSeconds: timer
        })
      });
    } catch (err) {
      console.error('Error submitting quiz attempt:', err);
    } finally {
      setSavingAttempt(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/10 border border-slate-800/40 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[450px] text-center max-w-4xl mx-auto my-8">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
        </div>
        <h3 className="text-md font-extrabold text-white animate-pulse">Formulating Lesson-aligned Questions</h3>
        <p className="text-xs text-amber-400 font-bold mt-1 uppercase tracking-widest">Designing adaptive problem blocks and logical rationales</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center max-w-4xl mx-auto my-8">
        <p className="text-rose-400 font-bold mb-4">{error || 'Quiz failed to generate.'}</p>
        <button 
          onClick={fetchQuizQuestions}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Compilation</span>
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const accuracy = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="cursor-pointer group flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Exit Assessment</span>
        </button>

        {/* Dynamic stopwatch badge */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3.5 py-2 rounded-xl text-xs font-extrabold text-amber-400">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>{formatTime(timer)}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!quizFinished ? (
          <motion.div
            key="quiz-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Progress indicator */}
            <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-2">
              <span>Adaptive Question {currentIdx + 1} of {questions.length}</span>
              <span className="font-bold text-white">{Math.round(((currentIdx + 1) / questions.length) * 100)}% Done</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-900">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Text block */}
            <div className="backdrop-blur-xl bg-slate-900/30 border border-slate-850 p-6 md:p-8 rounded-2xl shadow-xl flex items-start gap-4">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex-shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-sm md:text-md font-extrabold text-white leading-relaxed">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Options list */}
            <div className="space-y-3">
              {currentQuestion.options?.map((opt: string, optIdx: number) => {
                const isSelected = selectedIdx === optIdx;
                const isCorrectOption = optIdx === currentQuestion.correctOptionIndex;
                
                // Coloring state variables
                let btnStyle = 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-300';
                let checkIcon = null;

                if (answered) {
                  if (isCorrectOption) {
                    btnStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold';
                    checkIcon = <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold';
                    checkIcon = <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />;
                  } else {
                    btnStyle = 'bg-slate-950/20 border-slate-900 text-slate-600';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={answered}
                    onClick={() => handleOptionSelect(optIdx)}
                    className={`w-full text-left p-4.5 rounded-xl border flex items-center justify-between gap-4 cursor-pointer text-xs transition-all relative ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] font-extrabold uppercase bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md text-slate-400">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {checkIcon}
                  </button>
                );
              })}
            </div>

            {/* Rationale / Explanation display */}
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-slate-900/20 border border-slate-800 p-6 rounded-2xl"
              >
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                  Pedagogical Rationale
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  {currentQuestion.explanation}
                </p>
                
                {/* Next button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleNext}
                    className="cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                  >
                    <span>{currentIdx + 1 === questions.length ? 'Finish Quiz' : 'Next Question'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="quiz-summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-xl bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 text-center max-w-xl mx-auto"
          >
            {/* Crown avatar header */}
            <div className="inline-flex p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Award className="w-12 h-12" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white">Quiz Finished!</h2>
              <p className="text-xs text-slate-400 mt-1">Excellent assessment block. Your metrics have been submitted successfully.</p>
            </div>

            {/* Statistics grids */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl flex flex-col items-center justify-center">
                <Percent className="w-5 h-5 text-indigo-400 mb-1" />
                <span className="text-xs font-bold text-slate-500">Correct Answers</span>
                <span className="text-lg font-extrabold text-white mt-1">{correctCount} / {questions.length}</span>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl flex flex-col items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-xs font-bold text-slate-500">Study stopwatch</span>
                <span className="text-lg font-extrabold text-white mt-1">{formatTime(timer)}</span>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl col-span-2 flex flex-col items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-bold text-slate-500">Result Accuracy</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1">{accuracy}%</span>
              </div>
            </div>

            {/* Retry or go back buttons */}
            <div className="flex justify-center gap-3">
              <button
                onClick={onBack}
                className="cursor-pointer bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold py-3 px-6 rounded-xl text-xs transition-all"
              >
                Return to Syllabus
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
