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
    <header className="border-b border-border-metal pb-4">
      <nav className="flex justify-center">
        <ul className="flex gap-6">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-2 font-display uppercase tracking-wider text-lg ${
                  activeTab === tab.id 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-wheat-300 hover:text-wheat-200'
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