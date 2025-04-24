import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiStar, FiCalendar, FiTrophy, FiSettings } from 'react-icons/fi';
import clsx from 'clsx';

type AppShellProps = {
  children: ReactNode;
};

const navigationItems = [
  { name: 'Today', href: '/', icon: FiHome },
  { name: 'Challenges', href: '/challenges', icon: FiTrophy },
  { name: 'Daily Tasks', href: '/daily', icon: FiCalendar },
  { name: 'Main Quests', href: '/main', icon: FiStar },
  { name: 'Settings', href: '/settings', icon: FiSettings },
];

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Livion</h1>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4">
        <div className="flex h-screen">
          {/* Sidebar Navigation */}
          <div className="w-20 md:w-64 bg-background-dark flex-shrink-0">
            <div className="h-16 flex items-center justify-center md:justify-start px-4 border-b border-gray-800">
              <h1 className="text-2xl font-display hidden md:block text-white">LIVION</h1>
              <h1 className="text-2xl font-display md:hidden text-white">L</h1>
            </div>
            
            <nav className="mt-6">
              <ul className="space-y-2 px-2">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={clsx(
                          'flex items-center px-3 py-3 text-sm rounded-md transition-colors',
                          isActive 
                            ? 'bg-primary text-white' 
                            : 'text-gray-300 hover:bg-background-light hover:text-white'
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="ml-3 hidden md:block">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            
            {/* Points/Level Display */}
            <div className="absolute bottom-0 w-20 md:w-64 p-4 border-t border-gray-800">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-primary-dark flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div className="ml-3 hidden md:block">
                  <div className="text-sm font-medium">Level 1</div>
                  <div className="text-xs text-gray-300">Novice</div>
                </div>
              </div>
              
              <div className="hidden md:block">
                <div className="flex justify-between text-xs mb-1">
                  <span>XP: 200/1000</span>
                  <span>20%</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-auto">
            <div className="h-16 border-b border-gray-800 flex items-center px-6">
              <div className="text-xl font-semibold">{
                navigationItems.find(item => item.href === pathname)?.name || 'Dashboard'
              }</div>
              
              <div className="ml-auto flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-secondary font-bold">500</span>
                  <span className="ml-1 text-gray-300">points</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white p-4">
        <div className="container mx-auto">
          <p className="text-center">© {new Date().getFullYear()} Livion. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AppShell; 