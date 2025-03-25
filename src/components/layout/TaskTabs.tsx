import React, { useState, useEffect } from 'react';
import { TabsContainer, TabButton } from '../ui/StyledElements';
import TodayTab from '../tabs/TodayTab';
import MainQuestTab from '../tabs/MainQuestTab';
import SideQuestTab from '../tabs/SideQuestTab';
import DailyTab from '../tabs/DailyTab';

type TabType = 'today' | 'main' | 'side' | 'daily';

interface TaskTabsProps {
  initialTab?: string | null;
}

const TaskTabs: React.FC<TaskTabsProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // Set the active tab when initialTab changes
  useEffect(() => {
    if (initialTab && (initialTab === 'today' || initialTab === 'main' || initialTab === 'side' || initialTab === 'daily')) {
      setActiveTab(initialTab as TabType);
    }
  }, [initialTab]);

  return (
    <>
      <TabsContainer>
        <TabButton
          active={activeTab === 'today'}
          onClick={() => setActiveTab('today')}
        >
          今日
        </TabButton>
        <TabButton
          active={activeTab === 'main'}
          onClick={() => setActiveTab('main')}
        >
          主线
        </TabButton>
        <TabButton
          active={activeTab === 'side'}
          onClick={() => setActiveTab('side')}
        >
          支线
        </TabButton>
        <TabButton
          active={activeTab === 'daily'}
          onClick={() => setActiveTab('daily')}
        >
          日常
        </TabButton>
      </TabsContainer>

      {activeTab === 'today' && <TodayTab />}
      {activeTab === 'main' && <MainQuestTab />}
      {activeTab === 'side' && <SideQuestTab />}
      {activeTab === 'daily' && <DailyTab />}
    </>
  );
};

export default TaskTabs; 