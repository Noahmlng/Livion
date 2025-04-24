import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/layout/ThemeProvider';
import { TaskProvider } from './context/TaskContext';
import AppShell from './components/AppShell';
import GameWorld from './components/layout/GameWorld';
import SimpleTest from './components/SimpleTest';

// Simple page components
const ChallengesPage = () => <div className="p-6 bg-blue-500 text-white rounded-lg">Challenges Page</div>;
const DailyPage = () => <div className="p-6 bg-green-500 text-white rounded-lg">Daily Tasks Page</div>;
const MainPage = () => <div className="p-6 bg-yellow-500 text-white rounded-lg">Main Quests Page</div>;
const SettingsPage = () => <div className="p-6 bg-purple-500 text-white rounded-lg">Settings Page</div>;

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TaskProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<GameWorld />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/daily" element={<DailyPage />} />
            <Route path="/main" element={<MainPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppShell>
      </TaskProvider>
    </ThemeProvider>
  );
};

export default App;
