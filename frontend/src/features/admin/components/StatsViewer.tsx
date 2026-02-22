import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, FileText, Clock, Download, Upload, BarChart3, History, RotateCcw } from 'lucide-react';
import * as api from '../../../api/client';
import type { Semester, Week, Event, Task, User, Team, AuditLogPage, OverviewStats, UserStats, TeamStats, SemesterStats } from '../../../types';
import { formatEventDateTime, formatDate } from '../../../utils/dateFormat';
import { FormModal } from './FormModal';


export function StatsViewer() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [semesterStats, setSemesterStats] = useState<SemesterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadSemestersAndSetDefault();
  }, []);

  useEffect(() => {
    if (initialized) {
      loadStats();
    }
  }, [selectedSemester, initialized]);

  async function loadSemestersAndSetDefault() {
    try {
      const data = await api.getSemesters();
      setSemesters(data);
      // Find active semester and set it as default
      const activeSemester = data.find(s => s.is_active);
      if (activeSemester) {
        setSelectedSemester(activeSemester.id);
      }
      setInitialized(true);
    } catch (err) {
      console.error(err);
      setInitialized(true);
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const [o, u, t, s] = await Promise.all([
        api.getOverviewStats(selectedSemester),
        api.getUserStats(selectedSemester),
        api.getTeamStats(selectedSemester),
        api.getSemesterStats()
      ]);
      setOverview(o);
      setUserStats(u);
      setTeamStats(t);
      setSemesterStats(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Semester</label>
        <select
          value={selectedSemester ?? ''}
          onChange={(e) => setSelectedSemester(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full max-w-xs px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Time</option>
          {semesters.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
            <p className="text-3xl font-bold text-primary-500">{overview.total_tasks}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{overview.tasks_completed}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{overview.tasks_pending}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
            <p className="text-3xl font-bold text-primary-500">{overview.completion_rate}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
          </div>
        </div>
      )}

      {/* User Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">User Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">Name</th>
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center">Assigned</th>
                <th className="pb-2 text-center">Completed</th>
                <th className="pb-2 text-center">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {userStats.map(u => (
                <tr key={u.user_id}>
                  <td className="py-2 text-gray-900 dark:text-gray-200">{u.display_name}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">{u.team_name || '-'}</td>
                  <td className="py-2 text-center text-gray-900 dark:text-gray-200">{u.tasks_assigned}</td>
                  <td className="py-2 text-center text-green-600">{u.tasks_completed}</td>
                  <td className="py-2 text-center">
                    <span className={`font-medium ${u.completion_rate >= 80 ? 'text-green-600' : u.completion_rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {u.completion_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Team Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center">Members</th>
                <th className="pb-2 text-center">Tasks</th>
                <th className="pb-2 text-center">Completed</th>
                <th className="pb-2 text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {teamStats.map(t => (
                <tr key={t.team_id}>
                  <td className="py-2 text-gray-900 dark:text-gray-200 font-medium">{t.team_name}</td>
                  <td className="py-2 text-center text-gray-500 dark:text-gray-400">{t.member_count}</td>
                  <td className="py-2 text-center text-gray-900 dark:text-gray-200">{t.tasks_assigned}</td>
                  <td className="py-2 text-center text-green-600">{t.tasks_completed}</td>
                  <td className="py-2 text-center font-medium text-primary-500">{t.completion_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Semester Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Semester Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">Semester</th>
                <th className="pb-2 text-center">Weeks</th>
                <th className="pb-2 text-center">Events</th>
                <th className="pb-2 text-center">Tasks</th>
                <th className="pb-2 text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {semesterStats.map(s => (
                <tr key={s.semester_id}>
                  <td className="py-2 text-gray-900 dark:text-gray-200 font-medium">{s.semester_name}</td>
                  <td className="py-2 text-center text-gray-500 dark:text-gray-400">{s.weeks_count}</td>
                  <td className="py-2 text-center text-gray-500 dark:text-gray-400">{s.events_count}</td>
                  <td className="py-2 text-center text-gray-900 dark:text-gray-200">{s.tasks_count}</td>
                  <td className="py-2 text-center font-medium text-primary-500">{s.completion_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

