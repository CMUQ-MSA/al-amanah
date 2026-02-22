import { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Settings, ChevronDown, ChevronRight, Clock, X, AlertTriangle, Check, Wrench, RotateCcw, Send, Calendar, Key, Bell } from 'lucide-react';
import * as api from '../api/client';
import type { DashboardData, DashboardWeek, DashboardEvent, Task } from '../types';
import { formatEventDateTime } from '../utils/dateFormat';
import { ThemeToggle } from '../components/ThemeToggle';
import { useDashboardData } from '../hooks/useDashboardData';

import { PasswordChangeModal } from '../features/dashboard/components/PasswordChangeModal';
import { EventCard } from '../features/dashboard/components/EventCard';


export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { data, loading, error, selectedWeek, setSelectedWeek, refresh, updateTaskOptimistically } = useDashboardData();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 dark:bg-gray-900">{error}</div>;

  const activeWeek = data?.weeks.find(w => w.id === selectedWeek);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img key={theme} src={theme === 'dark' ? '/images/White_Clear.png' : '/images/MSA_main_clear.png'} alt="MSA Logo" className="h-14 w-auto" />
            <h1 className="text-xl font-serif font-bold text-primary-500">Task Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => setShowPasswordModal(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors" title="Change Password"><Key size={20} /></button>
            {user?.role === 'ADMIN' && <a href="/admin" className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"><Settings size={20} /></a>}
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{user?.display_name}</span>
            <button onClick={logout} className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {!data?.semester_name ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No active semester.</div>
      ) : (
        <>
          {/* Semester Bar */}
          <div className="bg-primary-500 text-white py-3">
            <div className="max-w-5xl mx-auto px-4 flex items-center gap-2">
              <Calendar size={18} />
              <span className="font-serif font-semibold text-lg">{data.semester_name}</span>
            </div>
          </div>

          {/* Week Tabs */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[52px] z-10 overflow-x-auto shadow-sm">
            <div className="max-w-5xl mx-auto px-4 flex gap-1">
              {data.weeks.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeek(w.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    selectedWeek === w.id 
                      ? 'border-primary-500 text-primary-500' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-primary-400'
                  } ${w.is_current ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  Week {w.week_number}
                  {w.is_current && <span className="ml-1 text-xs text-accent-400">●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Events List - Flat, Less Nesting */}
          <main className="max-w-5xl mx-auto px-4 py-6">
            {activeWeek ? (
              <div className="space-y-4">
                {activeWeek.events.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No events this week.</p>
                ) : (
                  activeWeek.events.map((event) => (
                    <EventCard key={event.id} event={event} refresh={refresh} updateTask={updateTaskOptimistically} isAdmin={user?.role === 'ADMIN'} />
                  ))
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Select a week to view events.</p>
            )}
          </main>
        </>
      )}
      
      {/* Password Change Modal */}
      {showPasswordModal && <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}






