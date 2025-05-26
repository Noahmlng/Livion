import React, { createContext, useContext, useState, ReactNode } from 'react';

// 时间段类型
type TimeSlot = 'morning' | 'afternoon' | 'evening';

// TodayView 状态接口
interface TodayViewState {
  // 折叠状态
  challengesCollapsed: boolean;
  templatesCollapsed: boolean;
  
  // 任务排序状态
  temporaryTaskOrder: Record<TimeSlot, string[]>;
  
  // 下方标签页状态
  activeTab: 'history' | 'notes';
  visibleDays: number;
  notesPage: number;
  hasMoreNotes: boolean;
  
  // 编辑状态
  editingTaskId: string | null;
  editingNoteId: string | null;
}

// TasksView 状态接口
interface TasksViewState {
  selectedTaskId: number | null;
  editingTitle: boolean;
  editingReward: boolean;
  editingDescription: boolean;
}

// 应用状态接口
interface AppState {
  todayView: TodayViewState;
  tasksView: TasksViewState;
}

// Context 接口
interface AppStateContextType {
  state: AppState;
  
  // TodayView 状态更新方法
  updateTodayViewState: (updates: Partial<TodayViewState>) => void;
  setChallengesCollapsed: (collapsed: boolean) => void;
  setTemplatesCollapsed: (collapsed: boolean) => void;
  setTemporaryTaskOrder: (order: Record<TimeSlot, string[]>) => void;
  setActiveTab: (tab: 'history' | 'notes') => void;
  setVisibleDays: (days: number) => void;
  setNotesPage: (page: number) => void;
  setHasMoreNotes: (hasMore: boolean) => void;
  setEditingTaskId: (id: string | null) => void;
  setEditingNoteId: (id: string | null) => void;
  
  // TasksView 状态更新方法
  updateTasksViewState: (updates: Partial<TasksViewState>) => void;
  setSelectedTaskId: (id: number | null) => void;
  setEditingTitle: (editing: boolean) => void;
  setEditingReward: (editing: boolean) => void;
  setEditingDescription: (editing: boolean) => void;
}

// 初始状态
const initialState: AppState = {
  todayView: {
    challengesCollapsed: false,
    templatesCollapsed: false,
    temporaryTaskOrder: {
      morning: [],
      afternoon: [],
      evening: []
    },
    activeTab: 'history',
    visibleDays: 8,
    notesPage: 1,
    hasMoreNotes: true,
    editingTaskId: null,
    editingNoteId: null,
  },
  tasksView: {
    selectedTaskId: null,
    editingTitle: false,
    editingReward: false,
    editingDescription: false,
  }
};

// 创建 Context
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Provider 组件
export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);

  // TodayView 状态更新方法
  const updateTodayViewState = (updates: Partial<TodayViewState>) => {
    setState(prev => ({
      ...prev,
      todayView: { ...prev.todayView, ...updates }
    }));
  };

  const setChallengesCollapsed = (collapsed: boolean) => {
    updateTodayViewState({ challengesCollapsed: collapsed });
  };

  const setTemplatesCollapsed = (collapsed: boolean) => {
    updateTodayViewState({ templatesCollapsed: collapsed });
  };

  const setTemporaryTaskOrder = (order: Record<TimeSlot, string[]>) => {
    updateTodayViewState({ temporaryTaskOrder: order });
  };

  const setActiveTab = (tab: 'history' | 'notes') => {
    updateTodayViewState({ activeTab: tab });
  };

  const setVisibleDays = (days: number) => {
    updateTodayViewState({ visibleDays: days });
  };

  const setNotesPage = (page: number) => {
    updateTodayViewState({ notesPage: page });
  };

  const setHasMoreNotes = (hasMore: boolean) => {
    updateTodayViewState({ hasMoreNotes: hasMore });
  };

  const setEditingTaskId = (id: string | null) => {
    updateTodayViewState({ editingTaskId: id });
  };

  const setEditingNoteId = (id: string | null) => {
    updateTodayViewState({ editingNoteId: id });
  };

  // TasksView 状态更新方法
  const updateTasksViewState = (updates: Partial<TasksViewState>) => {
    setState(prev => ({
      ...prev,
      tasksView: { ...prev.tasksView, ...updates }
    }));
  };

  const setSelectedTaskId = (id: number | null) => {
    updateTasksViewState({ selectedTaskId: id });
  };

  const setEditingTitle = (editing: boolean) => {
    updateTasksViewState({ editingTitle: editing });
  };

  const setEditingReward = (editing: boolean) => {
    updateTasksViewState({ editingReward: editing });
  };

  const setEditingDescription = (editing: boolean) => {
    updateTasksViewState({ editingDescription: editing });
  };

  const value: AppStateContextType = {
    state,
    updateTodayViewState,
    setChallengesCollapsed,
    setTemplatesCollapsed,
    setTemporaryTaskOrder,
    setActiveTab,
    setVisibleDays,
    setNotesPage,
    setHasMoreNotes,
    setEditingTaskId,
    setEditingNoteId,
    updateTasksViewState,
    setSelectedTaskId,
    setEditingTitle,
    setEditingReward,
    setEditingDescription,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Hook 来使用 Context
export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export default AppStateContext; 