import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroUIProvider } from '@heroui/react';
import TodayView from './components/tabs/TodayView';
import TasksView from './components/tabs/TasksView';
// import PointsTestPage from './components/PointsTestPage';
import AppHeader from './components/layout/AppHeader';
import { ValhallaTaskProvider } from './context/ValhallaTaskContext';
import { DbProvider } from './context/DbContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppStateProvider } from './context/AppStateContext';
import Login from './components/auth/Login';
import './App.css';
import './components/tabs/hideScrollbar.css';

const TABS = [
  { id: 'today', label: '今天', icon: '📅', component: TodayView },
  { id: 'tasks', label: '支线任务', icon: '⚔️', component: TasksView },
  // { id: 'points-test', label: '积分测试', icon: '🧪', component: PointsTestPage },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState('today');
  const { user, loading, refreshAuthState } = useAuth();
  const [showLogin, setShowLogin] = useState(true); // 默认显示登录界面
  
  // 检测用户状态并决定是否显示登录页面
  useEffect(() => {
    if (user) {
      // 有用户登录，隐藏登录界面
      setShowLogin(false);
    } else if (!loading) {
      // 没有用户且加载完成，显示登录界面
      setShowLogin(true);
    }
  }, [user, loading]);
  
  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || TodayView;
  
  // 登录成功的回调函数
  const handleLoginSuccess = useCallback(async () => {
    try {
      // 刷新身份验证状态
      await refreshAuthState();
      
      // 强制不显示登录页面
      setShowLogin(false);
    } catch (err) {
      console.error('Error during login success handling:', err);
    }
  }, [refreshAuthState]);
  
  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="text-text-primary text-xl">加载中...</div>
      </div>
    );
  }
  
  // 根据showLogin状态决定显示登录页面还是主应用
  return (
    <>
      {/* 登录界面 */}
      {showLogin && (
        <Login onLogin={handleLoginSuccess} />
      )}
      
      {/* 主应用界面 */}
      {!showLogin && (
        <HeroUIProvider>
          <div className="dark text-foreground bg-background">
            <DbProvider>
              <ValhallaTaskProvider>
                <AppStateProvider>
                  <div className="bg-bg-dark text-text-primary font-body overflow-auto" style={{ height: '100vh' }}>
                    <div className="container mx-auto px-4 py-6">
                      <div className="relative mb-4">
                        <div className="flex justify-center">
                          <AppHeader 
                            tabs={TABS} 
                            activeTab={activeTab} 
                            onTabChange={setActiveTab} 
                          />
                        </div>
                      </div>
                      
                      <main className="mt-6">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="pb-12"
                          >
                            <ActiveComponent />
                          </motion.div>
                        </AnimatePresence>
                      </main>
                    </div>
                  </div>
                </AppStateProvider>
              </ValhallaTaskProvider>
            </DbProvider>
          </div>
        </HeroUIProvider>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
