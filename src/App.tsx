/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle } from 'lucide-react';
import AuthView from './components/AuthView';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RoadmapView from './components/RoadmapView';
import LessonView from './components/LessonView';
import NotesView from './components/NotesView';
import QuizView from './components/QuizView';
import CodingPractice from './components/CodingPractice';
import BookmarksView from './components/BookmarksView';
import RecommendationsView from './components/RecommendationsView';
import AnalyticsView from './components/AnalyticsView';
import StreakCalendar from './components/StreakCalendar';
import ProfileView from './components/ProfileView';
import LogsView from './components/LogsView';

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Stats / streak state
  const [streak, setStreak] = useState<any>({ currentStreak: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);

  // Navigation & Sub-views states
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [activeRoadmap, setActiveRoadmap] = useState<any>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [lessonViewMode, setLessonViewMode] = useState<'lesson' | 'notes' | 'quiz' | null>(null);
  const [codingMode, setCodingMode] = useState<boolean>(false);

  // App-Wide Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Bookmarks local persistent cache
  const [bookmarks, setBookmarks] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('learnflow_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load user data on startup if token is active
  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  // Synchronize bookmarks to local cache
  useEffect(() => {
    localStorage.setItem('learnflow_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const fetchUserData = async () => {
    try {
      // 1. Fetch user profile
      const profResponse = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!profResponse.ok) {
        handleLogout();
        return;
      }
      const profData = await profResponse.json();
      setUser(profData.user);
      setProfile(profData.profile);

      // 2. Fetch streaks
      const streakResponse = await fetch('/api/streaks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        setStreak(streakData);
      }

      // 3. Fetch notifications
      const notifResponse = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotifications(notifData);
      }
    } catch (err) {
      console.error('Error fetching bootstrap payload:', err);
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: any, newProfile: any) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setProfile(newProfile);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setActiveRoadmap(null);
    setActiveLessonId(null);
    setLessonViewMode(null);
    setCodingMode(false);
  };

  const handleDeleteRoadmap = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this roadmap and all its progress?')) return;
    try {
      const response = await fetch(`/api/roadmaps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        triggerToast('Roadmap and all related progress successfully deleted!', 'success');
        setActiveRoadmap(null);
      } else {
        throw new Error(data.error || 'Failed to delete roadmap.');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Error occurred while deleting the roadmap.', 'error');
    }
  };

  const handleToggleBookmark = (item: { type: string; targetId: string; title: string; subtitle: string }) => {
    setBookmarks((prev) => {
      const exists = prev.some(b => b.type === item.type && b.targetId === item.targetId);
      if (exists) {
        return prev.filter(b => !(b.type === item.type && b.targetId === item.targetId));
      } else {
        return [item, ...prev];
      }
    });
  };

  const handleJumpToBookmark = async (bookmark: any) => {
    if (bookmark.type === 'lesson' || bookmark.type === 'note') {
      // We need to fetch the roadmap context first to make it seamless
      try {
        const response = await fetch('/api/roadmaps', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const roadmaps = await response.json();
        // Look for the roadmap that contains this lesson
        const matched = roadmaps.find((r: any) => 
          r.modules?.some((m: any) => m.lessons?.some((l: any) => l.id === bookmark.targetId))
        );

        if (matched) {
          setActiveRoadmap(matched);
          setActiveLessonId(bookmark.targetId);
          setLessonViewMode(bookmark.type === 'lesson' ? 'lesson' : 'notes');
          setCodingMode(false);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (bookmark.type === 'coding') {
      try {
        const response = await fetch('/api/roadmaps', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const roadmaps = await response.json();
        const matched = roadmaps.find((r: any) => r.id); // Default to first roadmap or locate
        if (matched) {
          setActiveRoadmap(matched);
          setCodingMode(true);
          setLessonViewMode(null);
          setActiveLessonId(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLessonCompletedInSubView = (lessonId: string) => {
    // Update local state isCompleted for active roadmap lessons dynamically
    if (activeRoadmap) {
      const updatedModules = activeRoadmap.modules.map((m: any) => {
        const updatedLessons = m.lessons.map((l: any) => {
          if (l.id === lessonId) {
            return { ...l, isCompleted: true };
          }
          return l;
        });
        return { ...m, lessons: updatedLessons };
      });

      // Calculate progress percentage
      let total = 0;
      let completed = 0;
      updatedModules.forEach((m: any) => {
        m.lessons?.forEach((l: any) => {
          total++;
          if (l.isCompleted) completed++;
        });
      });
      const progress = Math.round((completed / total) * 100);

      setActiveRoadmap({
        ...activeRoadmap,
        modules: updatedModules,
        progress
      });

      // Fetch user data in background to refresh streak/notifications
      fetchUserData();
    }
  };

  const handleProfileUpdated = (updatedUser: any, updatedProfile: any) => {
    setUser(updatedUser);
    setProfile(updatedProfile);
  };

  if (!token) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // Orchestrator: Determine central screen view
  const renderMainContent = () => {
    // 1. Detailed Coding Lab
    if (codingMode && activeRoadmap) {
      return (
        <CodingPractice
          roadmapId={activeRoadmap.id}
          token={token}
          onBack={() => setCodingMode(false)}
          bookmarks={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          triggerToast={triggerToast}
        />
      );
    }

    // 2. Lesson Detail Views
    if (activeLessonId && activeRoadmap) {
      if (lessonViewMode === 'lesson') {
        return (
          <LessonView
            roadmapId={activeRoadmap.id}
            lessonId={activeLessonId}
            token={token}
            onBack={() => { setActiveLessonId(null); setLessonViewMode(null); }}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onCompleteLesson={handleLessonCompletedInSubView}
          />
        );
      } else if (lessonViewMode === 'notes') {
        return (
          <NotesView
            roadmapId={activeRoadmap.id}
            lessonId={activeLessonId}
            token={token}
            onBack={() => { setActiveLessonId(null); setLessonViewMode(null); }}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
          />
        );
      } else if (lessonViewMode === 'quiz') {
        return (
          <QuizView
            roadmapId={activeRoadmap.id}
            lessonId={activeLessonId}
            token={token}
            onBack={() => { setActiveLessonId(null); setLessonViewMode(null); }}
          />
        );
      }
    }

    // 3. Roadmap Core Curriculum Breakdown
    if (activeRoadmap) {
      return (
        <RoadmapView
          roadmap={activeRoadmap}
          onBack={() => setActiveRoadmap(null)}
          onSelectLesson={(lessonId, mode) => {
            setActiveLessonId(lessonId);
            setLessonViewMode(mode);
          }}
          onSelectCoding={() => setCodingMode(true)}
          bookmarks={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          onDeleteRoadmap={handleDeleteRoadmap}
        />
      );
    }

    // 4. Primary Sidebar views
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            onSelectRoadmap={(roadmap) => {
              setActiveRoadmap(roadmap);
              setCodingMode(false);
              setActiveLessonId(null);
            }} 
            token={token} 
          />
        );
      case 'analytics':
        return <AnalyticsView token={token} />;
      case 'bookmarks':
        return (
          <BookmarksView
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onJumpToTarget={handleJumpToBookmark}
          />
        );
      case 'recommendations':
        return (
          <RecommendationsView
            token={token}
            onSelectRecommendedLesson={async (rId, lId) => {
              // Fetch syllabus details to restore full object context
              try {
                const response = await fetch('/api/roadmaps', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const roadmaps = await response.json();
                const matched = roadmaps.find((r: any) => r.id === rId);
                if (matched) {
                  setActiveRoadmap(matched);
                  setActiveLessonId(lId);
                  setLessonViewMode('lesson');
                  setCodingMode(false);
                }
              } catch (err) {
                console.error(err);
              }
            }}
          />
        );
      case 'streaks':
        return <StreakCalendar token={token} />;
      case 'profile':
        return (
          <ProfileView
            user={user}
            profile={profile}
            token={token}
            onProfileUpdate={handleProfileUpdated}
          />
        );
      case 'logs':
        return <LogsView token={token} />;
      default:
        return <div className="p-8 text-xs text-slate-500 font-sans">View not implemented.</div>;
    }
  };

  const isFullscreenSandbox = codingMode && activeRoadmap;

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none relative">
      
      {/* App-Wide Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
            <span className="text-xs font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar navigation (hidden if sandbox is fullscreen) */}
      {!isFullscreenSandbox && (
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => {
            setActiveView(view);
            // reset active paths when navigating main sidebar tabs
            setActiveRoadmap(null);
            setActiveLessonId(null);
            setLessonViewMode(null);
            setCodingMode(false);
          }}
          user={user}
          profile={profile}
          streak={streak}
          notifications={notifications}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Pane */}
      <main className={`transition-all duration-300 min-h-screen bg-radial from-slate-900 via-slate-950 to-black ${isFullscreenSandbox ? 'pl-0' : 'pl-64'}`}>
        {renderMainContent()}
      </main>
    </div>
  );
}
