import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, FileText, Clock, Download, Upload, BarChart3, History, RotateCcw } from 'lucide-react';
import * as api from '../../../api/client';
import type { Semester, Week, Event, Task, User, Team, AuditLogPage, OverviewStats, UserStats, TeamStats, SemesterStats } from '../../../types';
import { formatEventDateTime, formatDate } from '../../../utils/dateFormat';
import { FormModal } from './FormModal';


export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityFilter]);

  async function loadFilters() {
    try {
      const [a, e] = await Promise.all([
        api.getAuditActions(),
        api.getAuditEntityTypes()
      ]);
      setActions(a);
      setEntities(e);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        page,
        per_page: 25,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Entity</label>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="">All Entities</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" /></div>
        ) : logs && logs.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {logs.items.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{log.user_name || 'System'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-200">
                        {log.entity_type}
                        {log.entity_name && <span className="text-gray-500 dark:text-gray-400"> - {log.entity_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * 25) + 1} - {Math.min(page * 25, logs.total)} of {logs.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 dark:text-gray-300"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= logs.total_pages}
                  className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">No audit logs found.</p>
        )}
      </div>
    </div>
  );
}

