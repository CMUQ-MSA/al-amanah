import { useState, memo } from 'react';
import { ChevronDown, ChevronRight, Clock, Bell } from 'lucide-react';
import * as api from '../../../api/client';
import type { DashboardEvent, Task } from '../../../types';
import { formatEventDateTime } from '../../../utils/dateFormat';
import { TaskRow } from './TaskRow';

export const EventCard = memo(function EventCard({ event, refresh, updateTask, isAdmin }: { event: DashboardEvent; refresh: () => void; updateTask: (taskId: number, updates: Partial<Task>) => void; isAdmin?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  
  const completableTasks = event.tasks.filter(t => t.task_type === 'STANDARD');
  const doneCount = completableTasks.filter(t => t.status === 'DONE').length;
  const doneLabel = completableTasks.length > 0 ? `${doneCount}/${completableTasks.length} done` : '—';
  const pendingCount = event.tasks.filter(t => t.status === 'PENDING').length;

  const sendAllReminders = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pendingCount) return;
    setSendingReminders(true);
    try {
      const result = await api.sendEventReminders(event.id);
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-l-4 border-l-accent-400 border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      {/* Event Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} className="text-primary-400" /> : <ChevronRight size={20} className="text-primary-400" />}
          <div>
            <h3 className="font-serif font-semibold text-gray-900 dark:text-white text-lg">{event.name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1"><Clock size={14} className="text-primary-400" />{formatEventDateTime(event.datetime)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isAdmin && pendingCount > 0 && (
            <button
              onClick={sendAllReminders}
              disabled={sendingReminders}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              title={`Send reminders for ${pendingCount} pending tasks`}
            >
              <Bell size={14} />
              {sendingReminders ? '...' : `Remind All (${pendingCount})`}
            </button>
          )}
          <span className="px-2 py-1 bg-stone-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 font-medium">{doneLabel}</span>
        </div>
      </div>

      {/* Tasks - Flat List */}
      {expanded && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {event.tasks.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm p-4">No tasks for this event.</p>
          ) : (
            event.tasks.map((task) => <TaskRow key={task.id} task={task} refresh={refresh} updateTask={updateTask} />)
          )}
        </div>
      )}
    </div>
  );
});