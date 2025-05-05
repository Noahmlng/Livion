import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../db/api';
import { generateId } from '../db';

// Mock user for development
const MOCK_USER_ID = 'user_1';

interface DbContextType {
  userId: string;
  // Tasks
  tasks: any[];
  loadTasks: (category?: string) => Promise<void>;
  createTask: (data: any) => Promise<any>;
  updateTask: (taskId: string, data: any) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  // Schedule entries
  scheduleEntries: any[];
  loadScheduleEntries: (date?: Date) => Promise<void>;
  createScheduleEntry: (data: any) => Promise<any>;
  updateScheduleEntry: (entryId: string, data: any) => Promise<boolean>;
  deleteScheduleEntry: (entryId: string) => Promise<boolean>;
  // Notes
  notes: any[];
  loadNotes: () => Promise<void>;
  createNote: (content: string) => Promise<any>;
  updateNote: (noteId: string, content: string) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;
  // Loading state
  loading: boolean;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export function DbProvider({ children }: { children: ReactNode }) {
  const [userId] = useState<string>(MOCK_USER_ID);
  const [tasks, setTasks] = useState<any[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize with some data when the app starts
  useEffect(() => {
    const initializeData = async () => {
      await loadTasks();
      await loadScheduleEntries();
      await loadNotes();
    };

    initializeData();
  }, []);

  // Task functions
  const loadTasks = async (category?: string) => {
    setLoading(true);
    try {
      const result = await api.getTasks(userId, category);
      setTasks(result);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (data: any) => {
    setLoading(true);
    try {
      const result = await api.createTask({
        ...data,
        user_id: userId,
      });
      await loadTasks();
      return result;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId: string, data: any) => {
    setLoading(true);
    try {
      const result = await api.updateTask(taskId, data);
      await loadTasks();
      return result;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    setLoading(true);
    try {
      const result = await api.deleteTask(taskId);
      await loadTasks();
      return result;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Schedule entry functions
  const loadScheduleEntries = async (date?: Date) => {
    setLoading(true);
    try {
      const result = await api.getScheduleEntries(userId, date);
      setScheduleEntries(result);
    } catch (error) {
      console.error('Error loading schedule entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const createScheduleEntry = async (data: any) => {
    setLoading(true);
    try {
      const result = await api.createScheduleEntry({
        ...data,
        user_id: userId,
      });
      await loadScheduleEntries();
      return result;
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateScheduleEntry = async (entryId: string, data: any) => {
    setLoading(true);
    try {
      const result = await api.updateScheduleEntry(entryId, data);
      await loadScheduleEntries();
      return result;
    } catch (error) {
      console.error('Error updating schedule entry:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduleEntry = async (entryId: string) => {
    setLoading(true);
    try {
      const result = await api.deleteScheduleEntry(entryId);
      await loadScheduleEntries();
      return result;
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Note functions
  const loadNotes = async () => {
    setLoading(true);
    try {
      const result = await api.getNotes(userId);
      setNotes(result);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (content: string) => {
    setLoading(true);
    try {
      const result = await api.createNote({
        user_id: userId,
        content,
      });
      await loadNotes();
      return result;
    } catch (error) {
      console.error('Error creating note:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    setLoading(true);
    try {
      const result = await api.updateNote(noteId, { content });
      await loadNotes();
      return result;
    } catch (error) {
      console.error('Error updating note:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    setLoading(true);
    try {
      const result = await api.deleteNote(noteId);
      await loadNotes();
      return result;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <DbContext.Provider
      value={{
        userId,
        tasks,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        scheduleEntries,
        loadScheduleEntries,
        createScheduleEntry,
        updateScheduleEntry,
        deleteScheduleEntry,
        notes,
        loadNotes,
        createNote,
        updateNote,
        deleteNote,
        loading,
      }}
    >
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  const context = useContext(DbContext);
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
} 