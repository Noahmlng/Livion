import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/layout/ThemeProvider';
import { TaskProvider } from './context/TaskContext';
import AppShell from './components/AppShell';
import GameWorld from './components/layout/GameWorld';

// Placeholder page components
const Today = () => <div>Today's Tasks</div>;
const Challenges = () => <div>Challenges</div>;
const DailyTasks = () => <div>Daily Tasks</div>;
const MainQuests = () => <div>Main Quests</div>;
const Settings = () => <div>Settings</div>;

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TaskProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<GameWorld />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/daily" element={<DailyTasks />} />
            <Route path="/main" element={<MainQuests />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppShell>
      </TaskProvider>
    </ThemeProvider>
  );
};

export default App;
