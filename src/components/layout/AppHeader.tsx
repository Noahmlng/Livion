import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
}

interface AppHeaderProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const AppHeader = ({ tabs, activeTab, onTabChange }: AppHeaderProps) => {
  return (
    <header className="w-full">
      <nav className="flex justify-center">
        <ul className="flex gap-6 justify-center">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-2 font-display uppercase tracking-wider text-lg ${
                  activeTab === tab.id 
                    ? 'text-text-on-accent bg-accent-gold rounded-t-md' 
                    : 'text-text-primary hover:bg-sidebar-item-hover-bg'
                }`}
              >
                <span>{tab.label}</span>
              </motion.button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default AppHeader; 