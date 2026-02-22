import { useState, memo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { X, AlertTriangle, Check, Wrench, RotateCcw, Send } from 'lucide-react';
import * as api from '../../../api/client';
import type { Task } from '../../../types';

export const TaskRow = memo(function TaskRow({ task, refresh, updateTask }: { task: Task; refresh: () => void; updateTask: (taskId: number, updates: Partial<Task>) => void }) {
  const { user } = useAuth();
  const [modal, setModal] = useState<'none' | 'cantdo'>('none');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // Check if user can modify this task:
  // Admin OR assigned to user OR user's team matches assigned_team_id OR user is in assignees pool
  const canAct = user?.role === 'ADMIN' 
    || task.assigned_to === user?.id 
    || (task.assigned_team_id && user?.team_id === task.assigned_team_id)
    || task.assignees?.some(a => a.id === user?.id);
  const isAdmin = user?.role === 'ADMIN';

  const markDone = async () => {
    if (!canAct || busy) return;
    setBusy(true);
    // Optimistic update - immediately update the UI
    updateTask(task.id, { 
      status: 'DONE', 
      completed_by: user?.id, 
      completed_by_name: user?.display_name 
    });
    try { 
      await api.markTaskDone(task.id); 
    } catch (e) { 
      console.error(e);
      // Revert on error
      updateTask(task.id, { status: 'PENDING', completed_by: null, completed_by_name: null });
    }
    setBusy(false);
  };

  const undoStatus = async () => {
    if (!canAct || busy) return;
    setBusy(true);
    const previousStatus = task.status;
    const previousReason = task.cannot_do_reason;
    const previousCompletedBy = task.completed_by;
    const previousCompletedByName = task.completed_by_name;
    // Optimistic update
    updateTask(task.id, { 
      status: 'PENDING', 
      cannot_do_reason: null, 
      completed_by: null, 
      completed_by_name: null 
    });
    try { 
      await api.undoTaskStatus(task.id); 
    } catch (e) { 
      console.error(e);
      // Revert on error
      updateTask(task.id, { 
        status: previousStatus, 
        cannot_do_reason: previousReason,
        completed_by: previousCompletedBy,
        completed_by_name: previousCompletedByName
      });
    }
    setBusy(false);
  };

  const submitCantDo = async () => {
    if (busy) return;
    setBusy(true);
    // Optimistic update
    updateTask(task.id, { 
      status: 'CANNOT_DO', 
      cannot_do_reason: reason,
      completed_by: user?.id,
      completed_by_name: user?.display_name
    });
    setModal('none');
    try { 
      await api.markTaskCannotDo(task.id, reason); 
    } catch (e) { 
      console.error(e);
      // Revert on error
      updateTask(task.id, { 
        status: 'PENDING', 
        cannot_do_reason: null,
        completed_by: null,
        completed_by_name: null
      });
    }
    setBusy(false);
    setReason('');
  };

  const sendReminder = async () => {
    if (!isAdmin) return;
    setBusy(true);
    try { await api.sendTaskReminder(task.id); alert('Reminder sent!'); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to send reminder'); }
    setBusy(false);
  };

  const bg = task.status === 'DONE' ? 'bg-green-50 dark:bg-green-900/20' : task.status === 'CANNOT_DO' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-gray-800';

  return (
    <>
      <div className={`flex items-start justify-between p-3 ${bg} hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors`}>
        <div className="flex items-start gap-3">
          {task.task_type === 'SETUP' ? <Wrench size={20} className="text-gray-400 mt-0.5" />
            : task.status === 'DONE' ? (
              <button onClick={undoStatus} disabled={!canAct || busy} className="text-green-600 hover:text-green-800 disabled:opacity-50" title="Undo completion">
                <Check size={20} className="mt-0.5" />
              </button>
            )
            : task.status === 'CANNOT_DO' ? (
              <button onClick={undoStatus} disabled={!canAct || busy} className="text-amber-600 hover:text-amber-800 disabled:opacity-50" title="Undo status">
                <AlertTriangle size={20} className="mt-0.5" />
              </button>
            )
            : <button onClick={markDone} disabled={!canAct || busy} className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded mt-0.5 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 transition-colors" />}
          <div>
            <p className={task.status === 'DONE' ? 'line-through text-gray-400' : 'font-medium text-gray-800 dark:text-gray-200'}>{task.task_type === 'SETUP' && <span className="text-primary-400">[Setup] </span>}{task.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {task.assignees && task.assignees.length > 0 
                ? task.assignees.map(a => a.display_name).join(', ')
                : task.assignee_name || 'Unassigned'}
            </p>
            {task.status === 'DONE' && task.completed_by_name && isAdmin && (
              <p className="text-xs text-green-600 dark:text-green-400">✓ Completed by {task.completed_by_name}</p>
            )}
            {task.status === 'CANNOT_DO' && task.cannot_do_reason && (
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Reason: {task.cannot_do_reason}
                {task.completed_by_name && isAdmin && <span className="text-xs ml-1">(by {task.completed_by_name})</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && task.status === 'PENDING' && (task.task_type === 'STANDARD' || task.task_type === 'SETUP') && (
            <button onClick={sendReminder} disabled={busy} className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors" title="Send reminder now"><Send size={16} /></button>
          )}
          {canAct && task.status === 'PENDING' && (
            <button onClick={() => setModal('cantdo')} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" title="Mark as cannot do"><X size={16} /></button>
          )}
          {(task.status === 'DONE' || task.status === 'CANNOT_DO') && canAct && (
            <button onClick={undoStatus} disabled={busy} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors" title="Undo"><RotateCcw size={16} /></button>
          )}
        </div>
      </div>
      {modal === 'cantdo' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 border-t-4 border-accent-400 shadow-lg">
            <h3 className="text-lg font-serif font-semibold mb-4 text-gray-900 dark:text-white">Cannot Complete Task</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg resize-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none transition-colors" rows={3} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal('none')} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium dark:text-white">Cancel</button>
              <button onClick={submitCantDo} disabled={busy || !reason.trim()} className="flex-1 px-4 py-2 bg-accent-400 text-gray-900 font-medium rounded-lg hover:bg-accent-500 disabled:opacity-50 transition-colors">{busy ? '...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});