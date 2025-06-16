import { motion } from 'framer-motion';
import { Tabs, Tab } from '@heroui/react';

interface TabInterface {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
}

interface AppHeaderProps {
  tabs: TabInterface[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const AppHeader = ({ tabs, activeTab, onTabChange }: AppHeaderProps) => {
  return (
    <header className="w-full flex justify-center relative py-2">
      <div className="relative">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => onTabChange(key as string)}
          variant="underlined"
          classNames={{
            base: "w-auto",
            tabList: "gap-6 w-full relative rounded-none p-0 border-0 bg-transparent",
            cursor: "w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent h-0.5 shadow-[0_0_6px_rgba(224,166,57,0.5)]",
            tab: "max-w-fit px-4 py-2 h-auto relative group",
            tabContent: "relative z-10 font-mono text-sm font-medium tracking-wide transition-all duration-300"
          }}
          color="primary"
          size="sm"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              title={
                <motion.div 
                  className="flex items-center justify-center relative"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Simplified container */}
                  <div className={`absolute inset-0 rounded-md transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-amber-500/10 shadow-[0_0_8px_rgba(224,166,57,0.15)]' 
                      : 'group-hover:bg-amber-500/5'
                  }`} />
                  
                  {/* Simple label */}
                  <span className={`relative px-2 py-1 text-sm tracking-wider transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'text-amber-300' 
                      : 'text-amber-600/70 group-hover:text-amber-400'
                  }`}>
                    {tab.label}
                  </span>
                </motion.div>
              }
            />
          ))}
        </Tabs>
      </div>
    </header>
  );
};

export default AppHeader; 