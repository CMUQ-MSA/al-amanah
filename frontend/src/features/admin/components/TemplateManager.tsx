import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Calendar, FileText, Clock, Download, Upload, BarChart3, History, RotateCcw } from 'lucide-react';
import * as api from '../../../api/client';
import type { Semester, Week, Event, Task, User, Team, AuditLogPage, OverviewStats, UserStats, TeamStats, SemesterStats } from '../../../types';
import { formatEventDateTime, formatDate } from '../../../utils/dateFormat';
import { FormModal } from './FormModal';


export function TemplateManager() {
  const [eventTemplates, setEventTemplates] = useState<api.EventTemplate[]>([]);
  const [weekTemplates, setWeekTemplates] = useState<api.WeekTemplate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showWeekForm, setShowWeekForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<api.EventTemplate | null>(null);
  const [editingWeek, setEditingWeek] = useState<api.WeekTemplate | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [events, weeks, teamsData] = await Promise.all([
        api.getEventTemplates(),
        api.getWeekTemplates(),
        api.getTeams()
      ]);
      setEventTemplates(events);
      setWeekTemplates(weeks);
      setTeams(teamsData);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEventTemplate(data: { name: string; tasks: api.TaskTemplate[] }) {
    try {
      if (editingEvent) {
        // For both custom and default templates, use the ID as-is
        await api.updateEventTemplate(editingEvent.id, data);
      } else {
        await api.createEventTemplate(data);
      }
      loadData();
      setShowEventForm(false);
      setEditingEvent(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  }

  async function handleDeleteEventTemplate(template: api.EventTemplate) {
    if (!template.is_custom) {
      alert('Cannot delete default templates. Use Reset to restore the original.');
      return;
    }
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await api.deleteEventTemplate(template.id);
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  async function handleResetEventTemplate(template: api.EventTemplate) {
    if (!template.can_reset) return;
    if (!confirm(`Reset "${template.name}" back to its original default?`)) return;
    try {
      await api.resetEventTemplate(template.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset template');
    }
  }

  async function handleSaveWeekTemplate(data: { name: string; description?: string; events: api.WeekEventTemplate[] }) {
    try {
      if (editingWeek) {
        // For both custom and default templates, use the ID as-is
        await api.updateWeekTemplate(editingWeek.id, data);
      } else {
        await api.createWeekTemplate(data);
      }
      loadData();
      setShowWeekForm(false);
      setEditingWeek(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  }

  async function handleDeleteWeekTemplate(template: api.WeekTemplate) {
    if (!template.is_custom) {
      alert('Cannot delete default templates. Use Reset to restore the original.');
      return;
    }
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      await api.deleteWeekTemplate(template.id);
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  async function handleResetWeekTemplate(template: api.WeekTemplate) {
    if (!template.can_reset) return;
    if (!confirm(`Reset "${template.name}" back to its original default?`)) return;
    try {
      await api.resetWeekTemplate(template.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset template');
    }
  }

  if (loading) return <div className="text-center py-8 dark:text-gray-300">Loading...</div>;

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Event Templates Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-primary-500" />
            <h3 className="font-semibold dark:text-white">Event Templates</h3>
          </div>
          <button
            onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Plus size={16} /> New Template
          </button>
        </div>

        <div className="space-y-2">
          {eventTemplates.map((template) => (
            <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium dark:text-white">{template.name}</span>
                  {template.is_custom ? (
                    <span className="text-xs px-2 py-0.5 bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 rounded-full">Custom</span>
                  ) : template.is_modified ? (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">Modified</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">Default</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>{template.tasks.length} tasks</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingEvent(template); setShowEventForm(true); }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Edit template"
                >
                  <Edit2 size={14} />
                </button>
                {template.can_reset && (
                  <button
                    onClick={() => handleResetEventTemplate(template)}
                    className="p-1 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                    title="Reset to default"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                {template.is_custom && (
                  <button
                    onClick={() => handleDeleteEventTemplate(template)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Week Templates Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-primary-500" />
            <h3 className="font-semibold dark:text-white">Week Templates</h3>
          </div>
          <button
            onClick={() => { setEditingWeek(null); setShowWeekForm(true); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Plus size={16} /> New Template
          </button>
        </div>

        <div className="space-y-2">
          {weekTemplates.map((template) => (
            <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium dark:text-white">{template.name}</span>
                  {template.is_custom ? (
                    <span className="text-xs px-2 py-0.5 bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 rounded-full">Custom</span>
                  ) : template.is_modified ? (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">Modified</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">Default</span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {template.events.map((e, i) => {
                    const eventTemplate = eventTemplates.find(t => t.id === e.event_template_id);
                    return (
                      <span key={i} className="mr-3">
                        {DAYS[e.day_of_week]}: {eventTemplate?.name || e.event_template_id} @ {e.default_time}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingWeek(template); setShowWeekForm(true); }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Edit template"
                >
                  <Edit2 size={14} />
                </button>
                {template.can_reset && (
                  <button
                    onClick={() => handleResetWeekTemplate(template)}
                    className="p-1 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                    title="Reset to default"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                {template.is_custom && (
                  <button
                    onClick={() => handleDeleteWeekTemplate(template)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Template Form Modal */}
      {showEventForm && (
        <FormModal
          title={editingEvent ? 'Edit Event Template' : 'New Event Template'}
          onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
        >
          <EventTemplateForm
            key={editingEvent?.id ?? 'new'}
            initial={editingEvent}
            teams={teams}
            onSave={handleSaveEventTemplate}
            onCancel={() => { setShowEventForm(false); setEditingEvent(null); }}
          />
        </FormModal>
      )}

      {/* Week Template Form Modal */}
      {showWeekForm && (
        <FormModal
          title={editingWeek ? 'Edit Week Template' : 'New Week Template'}
          onClose={() => { setShowWeekForm(false); setEditingWeek(null); }}
        >
          <WeekTemplateEditorForm
            key={editingWeek?.id ?? 'new'}
            initial={editingWeek}
            eventTemplates={eventTemplates}
            onSave={handleSaveWeekTemplate}
            onCancel={() => { setShowWeekForm(false); setEditingWeek(null); }}
          />
        </FormModal>
      )}
    </div>
  );
}

function EventTemplateForm({ initial, teams, onSave, onCancel }: {
  initial: api.EventTemplate | null;
  teams: Team[];
  onSave: (data: { name: string; tasks: api.TaskTemplate[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [tasks, setTasks] = useState<api.TaskTemplate[]>(initial?.tasks || []);

  const handleAddTask = () => {
    setTasks([...tasks, { title: '', description: null, task_type: 'STANDARD', assigned_team_name: null }]);
  };

  const handleUpdateTask = (index: number, field: keyof api.TaskTemplate, value: string | null) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      tasks: tasks.filter(t => t.title.trim())
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Template Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium dark:text-gray-300">Tasks</label>
          <button
            type="button"
            onClick={handleAddTask}
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            + Add Task
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => handleUpdateTask(index, 'title', e.target.value)}
                  className="flex-1 px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                  placeholder="Task title"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveTask(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={task.task_type}
                  onChange={(e) => handleUpdateTask(index, 'task_type', e.target.value)}
                  className="px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="SETUP">Setup</option>
                </select>
                <select
                  value={task.assigned_team_name || ''}
                  onChange={(e) => handleUpdateTask(index, 'assigned_team_name', e.target.value || null)}
                  className="flex-1 px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                >
                  <option value="">No Team</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No tasks added yet</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
          Cancel
        </button>
        <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          Save
        </button>
      </div>
    </form>
  );
}

function WeekTemplateEditorForm({ initial, eventTemplates, onSave, onCancel }: {
  initial: api.WeekTemplate | null;
  eventTemplates: api.EventTemplate[];
  onSave: (data: { name: string; description?: string; events: api.WeekEventTemplate[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [events, setEvents] = useState<api.WeekEventTemplate[]>(initial?.events || []);

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleAddEvent = () => {
    setEvents([...events, { event_template_id: eventTemplates[0]?.id || '', day_of_week: 0, default_time: '12:00' }]);
  };

  const handleUpdateEvent = (index: number, field: keyof api.WeekEventTemplate, value: string | number) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const handleRemoveEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || undefined,
      events
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Template Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          rows={2}
          placeholder="Brief description of this week template"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium dark:text-gray-300">Events</label>
          <button
            type="button"
            onClick={handleAddEvent}
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            + Add Event
          </button>
        </div>

        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={event.event_template_id}
                  onChange={(e) => handleUpdateEvent(index, 'event_template_id', e.target.value)}
                  className="flex-1 px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                >
                  {eventTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={event.day_of_week}
                  onChange={(e) => handleUpdateEvent(index, 'day_of_week', parseInt(e.target.value))}
                  className="flex-1 px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                >
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />
                  <input
                    type="time"
                    value={event.default_time}
                    onChange={(e) => handleUpdateEvent(index, 'default_time', e.target.value)}
                    className="px-2 py-1 border dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No events added yet</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
          Cancel
        </button>
        <button type="submit" className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          Save
        </button>
      </div>
    </form>
  );
}

