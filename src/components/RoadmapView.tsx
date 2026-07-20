/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  HelpCircle, 
  PlayCircle, 
  Code, 
  Bookmark, 
  Clock, 
  Layers,
  Award,
  Zap,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

interface RoadmapViewProps {
  roadmap: any;
  onBack: () => void;
  onSelectLesson: (lessonId: string, mode: 'lesson' | 'notes' | 'quiz') => void;
  onSelectCoding: (roadmapId: string) => void;
  bookmarks: any[];
  onToggleBookmark: (bookmark: { type: string; targetId: string; title: string; subtitle: string }) => void;
  onDeleteRoadmap?: (id: string) => void;
}

export default function RoadmapView({ 
  roadmap, 
  onBack, 
  onSelectLesson, 
  onSelectCoding,
  bookmarks,
  onToggleBookmark,
  onDeleteRoadmap
}: RoadmapViewProps) {
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calculate curriculum statistics
  let totalLessons = 0;
  let completedCount = 0;

  roadmap.modules?.forEach((m: any) => {
    m.lessons?.forEach((l: any) => {
      totalLessons++;
      if (l.isCompleted) {
        completedCount++;
      }
    });
  });

  const isBookmarked = (lessonId: string) => {
    return bookmarks.some(b => b.type === 'lesson' && b.targetId === lessonId);
  };

  const handleBookmarkClick = (e: React.MouseEvent, lesson: any, moduleTitle: string) => {
    e.stopPropagation();
    onToggleBookmark({
      type: 'lesson',
      targetId: lesson.id,
      title: lesson.title,
      subtitle: `${roadmap.topic} • ${moduleTitle}`
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="cursor-pointer group flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Hub</span>
        </button>

        {/* Practice Code Lab Trigger and Delete Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectCoding(roadmap.id)}
            className="cursor-pointer flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
          >
            <Code className="w-4 h-4 animate-pulse" />
            <span>Open AI Coding Labs</span>
          </button>

          {onDeleteRoadmap && (
            <div className="flex items-center gap-2">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="cursor-pointer flex items-center gap-2 text-xs bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white font-extrabold px-4 py-2 rounded-xl transition-all shadow-md"
                  title="Delete this Roadmap"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Roadmap</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-slate-900 border border-rose-500/30 px-3 py-1.5 rounded-xl animate-pulse">
                  <span className="text-[11px] text-rose-400 font-bold mr-1">Confirm delete?</span>
                  <button
                    onClick={() => {
                      onDeleteRoadmap(roadmap.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="cursor-pointer text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cursor-pointer text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hero Stats Card */}
      <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-blue-500/5 rounded-full blur-[80px]" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/15 text-[10px] text-blue-400 font-extrabold tracking-widest uppercase">
              {roadmap.topic}
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-3 tracking-tight">{roadmap.title}</h1>
            <p className="text-slate-400 text-xs mt-1.5 max-w-2xl leading-relaxed">{roadmap.description}</p>
          </div>

          {/* Micro scorecards */}
          <div className="grid grid-cols-2 md:flex items-center gap-4">
            <div className="bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
              <Layers className="w-4 h-4 text-indigo-400 mb-1" />
              <span className="text-xs font-bold text-slate-400">Modules</span>
              <span className="text-lg font-extrabold text-white mt-0.5">{roadmap.modules?.length || 0}</span>
            </div>
            
            <div className="bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
              <Award className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-xs font-bold text-slate-400">Completed</span>
              <span className="text-lg font-extrabold text-emerald-400 mt-0.5">{completedCount} / {totalLessons}</span>
            </div>
          </div>
        </div>

        {/* Global Progress Line */}
        <div className="mt-6 pt-6 border-t border-slate-850 relative z-10">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
            <span>Syllabus Completion</span>
            <span className="font-bold text-white">{roadmap.progress || 0}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${roadmap.progress || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Curriculum Module Timeline breakdown */}
      <div className="space-y-6">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span>Curriculum Outline</span>
        </h2>

        <div className="space-y-6">
          {roadmap.modules?.map((m: any, mIdx: number) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mIdx * 0.1 }}
              className="backdrop-blur-xl bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Module Header bar */}
              <div className="p-5 bg-slate-900/40 border-b border-slate-850 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-md">
                    Module {mIdx + 1}
                  </span>
                  <h3 className="text-md font-extrabold text-white mt-1.5">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{m.description}</p>
                </div>
              </div>

              {/* Lesson Items row */}
              <div className="divide-y divide-slate-850/60">
                {m.lessons?.map((lesson: any, lIdx: number) => {
                  const lessonBookmarked = isBookmarked(lesson.id);
                  return (
                    <div 
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson.id, 'lesson')}
                      className="p-4 hover:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Status Checkbox indicator */}
                        <div className="mt-0.5 flex-shrink-0">
                          {lesson.isCompleted ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-950 border border-slate-800 group-hover:border-blue-500/50 flex items-center justify-center text-slate-600 transition-colors">
                              <span className="text-[9px] font-bold">{mIdx + 1}.{lIdx + 1}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                              {lesson.title}
                            </h4>
                            
                            {/* Bookmark icon trigger */}
                            <button
                              onClick={(e) => handleBookmarkClick(e, lesson, m.title)}
                              className={`p-1 rounded-md transition-all cursor-pointer ${
                                lessonBookmarked 
                                  ? 'text-blue-400 hover:text-blue-500 bg-blue-500/10' 
                                  : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              <Bookmark className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                          
                          <span className="text-[10px] text-slate-500 font-medium">Lesson {lIdx + 1} • Est. Study Time: 15-20m</span>
                        </div>
                      </div>

                      {/* Lesson Actions buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectLesson(lesson.id, 'lesson'); }}
                          className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-blue-600 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white font-bold text-[10px] rounded-lg transition-all"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Study Lesson</span>
                        </button>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectLesson(lesson.id, 'notes'); }}
                          className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-300 hover:text-white font-bold text-[10px] rounded-lg transition-all"
                        >
                          <FileText className="w-3 h-3" />
                          <span>AI Notes</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectLesson(lesson.id, 'quiz'); }}
                          className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-amber-600 border border-slate-800 hover:border-amber-500 text-slate-300 hover:text-white font-bold text-[10px] rounded-lg transition-all"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Adaptive Quiz</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
