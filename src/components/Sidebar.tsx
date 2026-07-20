/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  BarChart3, 
  Bookmark, 
  Sparkles, 
  User, 
  Flame, 
  LogOut, 
  GraduationCap, 
  Bell, 
  History 
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  user: any;
  profile: any;
  streak: any;
  notifications: any[];
  onLogout: () => void;
}

export default function Sidebar({ 
  activeView, 
  onNavigate, 
  user, 
  profile, 
  streak, 
  notifications, 
  onLogout 
}: SidebarProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', name: 'Learning Analytics', icon: BarChart3 },
    { id: 'bookmarks', name: 'Bookmarks', icon: Bookmark },
    { id: 'recommendations', name: 'AI Recommendations', icon: Sparkles },
    { id: 'streaks', name: 'Study Streaks', icon: Flame },
    { id: 'profile', name: 'My Profile', icon: User },
    { id: 'logs', name: 'Activity Logs', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between h-screen fixed top-0 left-0 z-20 font-sans select-none">
      {/* Branding & Logo */}
      <div>
        <div className="p-6 border-b border-slate-900/60 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white leading-none">
              Learn<span className="text-blue-500">Flow</span> AI
            </h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Version 1.0</span>
          </div>
        </div>

        {/* User Quick Stats Display */}
        <div className="p-4 mx-4 mt-4 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.name || 'Learn')}`} 
              alt="Avatar" 
              className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{user?.name || 'Explorer'}</span>
              <span className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider">{profile?.skillLevel || 'Beginner'}</span>
            </div>
          </div>

          {/* Quick Streak info */}
          <div 
            onClick={() => onNavigate('streaks')}
            className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/20 cursor-pointer transition-all"
            title="Current Streak"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-500">{streak?.currentStreak || 0}d</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 mt-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full cursor-pointer flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all relative ${
                  isActive 
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>

                {/* Sub-item specific features (e.g. notifications badge) */}
                {item.id === 'logs' && unreadCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer Section */}
      <div className="p-4 border-t border-slate-900/60 bg-slate-950">
        <button
          onClick={onLogout}
          className="w-full cursor-pointer flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Logout Account</span>
        </button>
      </div>
    </aside>
  );
}
