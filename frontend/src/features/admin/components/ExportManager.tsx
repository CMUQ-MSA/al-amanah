import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, FileText, Clock, Download, Upload, BarChart3, History, RotateCcw } from 'lucide-react';
import * as api from '../../../api/client';
import type { Semester, Week, Event, Task, User, Team, AuditLogPage, OverviewStats, UserStats, TeamStats, SemesterStats } from '../../../types';
import { formatEventDateTime, formatDate } from '../../../utils/dateFormat';
import { FormModal } from './FormModal';


export function ExportManager() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<api.ImportResult | null>(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  async function loadSemesters() {
    try {
      const data = await api.getSemesters();
      setSemesters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function exportSemester(id: number) {
    setExporting(true);
    try {
      const data = await api.exportSemester(id);
      downloadJson(data, `semester_${id}_export.json`);
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function exportAll() {
    setExporting(true);
    try {
      const data = await api.exportAll();
      downloadJson(data, 'all_semesters_export.json');
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  }

  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as api.ExportData;
      const result = await api.importData(data, true);
      setImportResult(result);
      loadSemesters();
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Invalid file'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Download size={20} className="text-primary-500" />
          Export Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Export semester data including weeks, events, tasks, and roster. Exports to JSON format.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={exportAll}
            disabled={exporting}
            className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
          >
            {exporting ? 'Exporting...' : 'Export All Semesters'}
          </button>
          
          <div className="grid gap-2">
            {semesters.map(s => (
              <button
                key={s.id}
                onClick={() => exportSemester(s.id)}
                disabled={exporting}
                className="flex items-center justify-between px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <span className="text-gray-900 dark:text-gray-200">{s.name}</span>
                <Download size={16} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Upload size={20} className="text-primary-500" />
          Import Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Import semester data from a previously exported JSON file. Existing semesters with the same name will be skipped.
        </p>
        
        <label className="block">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
          <div className="border-2 border-dashed dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors">
            {importing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
                <span className="text-gray-500 dark:text-gray-400">Importing...</span>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">Click to select a file</p>
                <p className="text-sm text-gray-400">JSON export files only</p>
              </>
            )}
          </div>
        </label>

        {importResult && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="font-medium text-green-800 dark:text-green-300 mb-2">Import Complete</p>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
              <li>Semesters: {importResult.semesters_created}</li>
              <li>Weeks: {importResult.weeks_created}</li>
              <li>Events: {importResult.events_created}</li>
              <li>Tasks: {importResult.tasks_created}</li>
            </ul>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-amber-700 dark:text-amber-400">
                <p className="font-medium">Warnings:</p>
                <ul className="text-sm">
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
