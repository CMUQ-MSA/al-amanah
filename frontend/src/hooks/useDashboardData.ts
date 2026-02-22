import { useState, useCallback, useEffect } from 'react';
import * as api from '../api/client';
import type { DashboardData, Task } from '../types';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadDashboard = useCallback(async (preserveWeek = false) => {
    try {
      const d = await api.getDashboard();
      setData(d);
      if (!preserveWeek || selectedWeek === null) {
        const currentWeek = d.weeks.find(w => w.is_current);
        setSelectedWeek(currentWeek?.id ?? d.weeks[0]?.id ?? null);
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [selectedWeek]);

  // Initial load
  useEffect(() => { loadDashboard(false); }, []);
  
  // Refresh function that preserves current week
  const refresh = useCallback(() => loadDashboard(true), [loadDashboard]);

  // Optimistic update for task status changes
  const updateTaskOptimistically = useCallback((taskId: number, updates: Partial<Task>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        weeks: prev.weeks.map(week => ({
          ...week,
          events: week.events.map(event => ({
            ...event,
            tasks: event.tasks.map(task => 
              task.id === taskId ? { ...task, ...updates } : task
            )
          }))
        }))
      };
    });
  }, []);

  return {
    data,
    loading,
    error,
    selectedWeek,
    setSelectedWeek,
    refresh,
    updateTaskOptimistically,
    initialLoad
  };
}
