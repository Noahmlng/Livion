import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TodayView from './components/tabs/TodayView';
import TasksView from './components/tabs/TasksView';
import AppHeader from './components/layout/AppHeader';
import { ValhallaTaskProvider } from './context/ValhallaTaskContext';
import './App.css';

const TABS = [
  { id: 'today', label: '今天', icon: '📅', component: TodayView },
  { id: 'tasks', label: '支线任务', icon: '⚔️', component: TasksView },
];

function App() {
  const [activeTab, setActiveTab] = useState('today');
  
  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || TodayView;
  
  return (
    <ValhallaTaskProvider>
      <div className="min-h-screen bg-bg-dark text-text-primary font-body flex flex-col">
        <div className="container mx-auto px-4 py-6 flex-shrink-0">
          <AppHeader 
            tabs={TABS} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          <main className="mt-6 flex-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="pb-12 h-full"
              >
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ValhallaTaskProvider>
  );
}

export default App;
