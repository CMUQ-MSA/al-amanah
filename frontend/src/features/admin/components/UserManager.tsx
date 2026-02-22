import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, FileText, Clock, Download, Upload, BarChart3, History, RotateCcw } from 'lucide-react';
import * as api from '../../../api/client';
import type { Semester, Week, Event, Task, User, Team, AuditLogPage, OverviewStats, UserStats, TeamStats, SemesterStats } from '../../../types';
import { formatEventDateTime, formatDate } from '../../../utils/dateFormat';
import { FormModal } from './FormModal';


export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: Partial<User> & { password?: string }) {
    try {
      if (editing) {
        await api.updateUser(editing.id, data);
      } else {
        await api.createUser(data as Partial<User> & { password: string });
      }
      loadUsers();
      setShowForm(false);
      setEditing(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save user');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  }

  if (loading) return <div className="text-center py-8 dark:text-gray-300">Loading...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold dark:text-white">Users</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowBatchForm(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700">
            📋 Batch Import
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg">
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2 px-3 dark:text-gray-300">Username</th>
              <th className="text-left py-2 px-3 dark:text-gray-300">Display Name</th>
              <th className="text-left py-2 px-3 dark:text-gray-300">Role</th>
              <th className="text-left py-2 px-3 dark:text-gray-300">Team</th>
              <th className="text-left py-2 px-3 dark:text-gray-300">Discord ID</th>
              <th className="text-right py-2 px-3 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-2 px-3 font-medium dark:text-white">{user.username}</td>
                <td className="py-2 px-3 dark:text-gray-300">{user.display_name}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{user.role}</span>
                </td>
                <td className="py-2 px-3">{user.team_name ? <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{user.team_name}</span> : <span className="dark:text-gray-400">-</span>}</td>
                <td className="py-2 px-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{user.discord_id || '-'}</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => { setEditing(user); setShowForm(true); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(user.id)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No users yet.</p>}

      {showForm && (
        <FormModal title={editing ? 'Edit User' : 'New User'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <UserForm key={editing?.id ?? 'new'} initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </FormModal>
      )}

      {showBatchForm && (
        <FormModal title="Batch Import Users" onClose={() => setShowBatchForm(false)}>
          <BatchUserForm onComplete={() => { setShowBatchForm(false); loadUsers(); }} onCancel={() => setShowBatchForm(false)} />
        </FormModal>
      )}
    </div>
  );
}

function BatchUserForm({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<api.BatchUserResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Parse CSV-like format: username, display_name, discord_id (optional), role (optional), team_name (optional)
      const lines = text.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const users: api.BatchUserItem[] = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        const teamName = parts[4]?.trim();
        return {
          username: parts[0],
          display_name: parts[1] || parts[0],
          discord_id: parts[2] || undefined,
          role: parts[3] || 'MEMBER',
          team_name: teamName && teamName.length > 0 ? teamName : undefined,
        };
      });

      const res = await api.batchCreateUsers(users);
      setResult(res);
    } catch (err) {
      setResult({ created: 0, skipped: 0, errors: [err instanceof Error ? err.message : 'Failed to import'] });
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm dark:text-gray-200"><strong>Created:</strong> {result.created}</p>
          <p className="text-sm dark:text-gray-200"><strong>Skipped (already exist):</strong> {result.skipped}</p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</p>
              <ul className="text-xs text-red-600 dark:text-red-400 mt-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
        <button onClick={onComplete} className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg">Done</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Users (CSV format)</label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Format: username, display_name, discord_id, role, team</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Example: jsmith, John Smith, 123456789, MEMBER, MEDIA</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"# Lines starting with # are ignored\njsmith, John Smith\nmjones, Mary Jones, 123456789012345678\naadmin, Admin User, , ADMIN"}
          className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg font-mono text-sm resize-none dark:bg-gray-700 dark:text-white"
          rows={8}
          required
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50">
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>
    </form>
  );
}

function UserForm({ initial, onSave, onCancel }: { initial: User | null; onSave: (d: Partial<User> & { password?: string }) => void; onCancel: () => void }) {
  const [username, setUsername] = useState(initial?.username || '');
  const [displayName, setDisplayName] = useState(initial?.display_name || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>(initial?.role || 'MEMBER');
  const [teamId, setTeamId] = useState<string>(initial?.team_id?.toString() || '');
  const [discordId, setDiscordId] = useState(initial?.discord_id || '');
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    api.getTeams().then(setTeams).catch(console.error);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<User> & { password?: string } = { 
      username, 
      display_name: displayName, 
      role, 
      team_id: teamId ? parseInt(teamId) : null, 
      discord_id: discordId || null 
    };
    if (password || !initial) data.password = password;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" required disabled={!!initial} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Display Name</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{initial ? 'New Password (leave blank to keep)' : 'Password'}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" required={!initial} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Team</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            <option value="">None</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Discord ID</label>
        <input type="text" value={discordId} onChange={(e) => setDiscordId(e.target.value)} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg dark:text-gray-300">Cancel</button>
        <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg">Save</button>
      </div>
    </form>
  );
}

