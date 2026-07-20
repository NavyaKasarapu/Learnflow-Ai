/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Bookmark, Trash2, ArrowRight, BookOpen, FileText, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookmarksViewProps {
  bookmarks: any[];
  onToggleBookmark: (bookmark: any) => void;
  onJumpToTarget: (bookmark: any) => void;
}

export default function BookmarksView({ bookmarks, onToggleBookmark, onJumpToTarget }: BookmarksViewProps) {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', name: 'All Bookmarks' },
    { id: 'lesson', name: 'Lessons' },
    { id: 'note', name: 'Study Notes' },
    { id: 'coding', name: 'Coding Labs' }
  ];

  const filteredBookmarks = activeTab === 'all' 
    ? bookmarks 
    : bookmarks.filter(b => b.type === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson': return <BookOpen className="w-4 h-4 text-blue-400" />;
      case 'note': return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'coding': return <Code className="w-4 h-4 text-amber-400" />;
      default: return <Bookmark className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'lesson': return 'Lesson Guide';
      case 'note': return 'Study Booklet';
      case 'coding': return 'Coding Problem';
      default: return 'Bookmark';
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans select-none text-slate-100">
      
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Saved Resources</h1>
        <p className="text-slate-400 text-xs mt-1">
          Access saved learning materials, quizzes, and code blocks to accelerate review times.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900 gap-2 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`cursor-pointer px-4 py-2.5 text-xs font-bold transition-all relative ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {filteredBookmarks.length === 0 ? (
          <motion.div
            key="empty-bookmarks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="backdrop-blur-xl bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center text-slate-500 min-h-[250px]"
          >
            <Bookmark className="w-12 h-12 text-slate-800 mb-3" />
            <h3 className="text-sm font-extrabold text-slate-300">No Resources Saved</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
              When reviewing lessons, study booklets, or coding problems, click the Bookmark icon to pin them here.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="bookmarks-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filteredBookmarks.map((b) => (
              <div
                key={`${b.type}-${b.targetId}`}
                onClick={() => onJumpToTarget(b)}
                className="group backdrop-blur-xl bg-slate-900/20 border border-slate-850 hover:border-slate-700 hover:bg-slate-900/40 p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                    {getIcon(b.type)}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      {getLabel(b.type)}
                    </span>
                    <h3 className="text-xs font-bold text-slate-200 mt-0.5 group-hover:text-blue-400 transition-colors">
                      {b.title}
                    </h3>
                    {b.subtitle && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{b.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Remove / Jump buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleBookmark(b); }}
                    className="cursor-pointer p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent transition-all"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  
                  <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                    <span>Study Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
