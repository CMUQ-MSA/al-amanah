import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, FileText, Clock, Download, Upload, BarChart3, History, RotateCcw } from 'lucide-react';
import * as api from '../../../api/client';
import type { Semester, Week, Event, Task, User, Team, AuditLogPage, OverviewStats, UserStats, TeamStats, SemesterStats } from '../../../types';
import { formatEventDateTime, formatDate } from '../../../utils/dateFormat';
import { FormModal } from './FormModal';


export function TeamManager() {
  const [teams, setTeams] = useState<{ id: number; name: string; color: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; color: string | null } | null>(null);

  useEffect(() => { loadTeams(); }, []);

  async function loadTeams() {
    try {
      const data = await api.getTeams();
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: { name: string; color?: string }) {
    try {
      if (editing) {
        await api.updateTeam(editing.id, data);
      } else {
        await api.createTeam(data);
      }
      loadTeams();
      setShowForm(false);
      setEditing(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save team');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this team? Users will be unassigned from this team.')) return;
    try {
      await api.deleteTeam(id);
      loadTeams();
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
  }

  if (loading) return <div className="text-center py-8 dark:text-gray-300">Loading...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold dark:text-white">Teams</h3>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg">
          <Plus size={16} /> Add Team
        </button>
      </div>

      <div className="space-y-2">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full border dark:border-gray-500" 
                style={{ backgroundColor: team.color || '#6b7280' }}
              />
              <span className="font-medium dark:text-white">{team.name}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(team); setShowForm(true); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(team.id)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No teams yet. Create your first team!</p>}

      {showForm && (
        <FormModal title={editing ? 'Edit Team' : 'New Team'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <TeamForm key={editing?.id ?? 'new'} initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </FormModal>
      )}
    </div>
  );
}

function TeamForm({ initial, onSave, onCancel }: { 
  initial: { id: number; name: string; color: string | null } | null; 
  onSave: (d: { name: string; color?: string }) => void; 
  onCancel: () => void 
}) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || '#3b82f6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, color });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Team Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Team Color</label>
        <div className="flex items-center gap-3">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 rounded cursor-pointer" />
          <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg font-mono text-sm dark:bg-gray-700 dark:text-white" placeholder="#3b82f6" />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
        <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg">Save</button>
      </div>
    </form>
  );
}

