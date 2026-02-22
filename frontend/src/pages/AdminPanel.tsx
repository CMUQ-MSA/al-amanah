import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BarChart3, History, Download } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { RosterManager } from '../features/admin/components/RosterManager';
import { UserManager } from '../features/admin/components/UserManager';
import { TeamManager } from '../features/admin/components/TeamManager';
import { TemplateManager } from '../features/admin/components/TemplateManager';
import { StatsViewer } from '../features/admin/components/StatsViewer';
import { AuditLogViewer } from '../features/admin/components/AuditLogViewer';
import { ExportManager } from '../features/admin/components/ExportManager';

export default function AdminPanel() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'roster' | 'users' | 'teams' | 'templates' | 'stats' | 'logs' | 'export'>('roster');

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <p className="text-red-600">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img key={theme} src={theme === 'dark' ? '/images/White_Clear.png' : '/images/MSA_main_clear.png'} alt="MSA Logo" className="h-14 w-auto" />
            <h1 className="text-xl font-serif font-bold text-primary-500">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/dashboard" className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors">← Back to Dashboard</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <nav className="flex gap-4">
            {(['roster', 'users', 'teams', 'templates', 'stats', 'logs', 'export'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-primary-400'}`}
              >
                {tab === 'roster' && 'Roster'}
                {tab === 'users' && 'Users'}
                {tab === 'teams' && 'Teams'}
                {tab === 'templates' && 'Templates'}
                {tab === 'stats' && <><BarChart3 size={14} className="inline mr-1" />Stats</>}
                {tab === 'logs' && <><History size={14} className="inline mr-1" />Logs</>}
                {tab === 'export' && <><Download size={14} className="inline mr-1" />Export</>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'roster' && <RosterManager />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'teams' && <TeamManager />}
        {activeTab === 'templates' && <TemplateManager />}
        {activeTab === 'stats' && <StatsViewer />}
        {activeTab === 'logs' && <AuditLogViewer />}
        {activeTab === 'export' && <ExportManager />}
      </main>
    </div>
  );
}

