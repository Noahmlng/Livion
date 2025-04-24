import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { WorldContainer } from '../ui/StyledElements';
import TaskTabs from './TaskTabs';
import TodayTasksHUD from '../ui/TodayTasksHUD';

// NPC character that can be interacted with
const NPC = styled(motion.div)<{ x: number; y: number }>`
  position: absolute;
  top: ${props => props.y}%;
  left: ${props => props.x}%;
  width: 70px;
  height: 70px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  .npc-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid gold;
    background-color: #333;
    box-shadow: 0 0 15px rgba(224, 166, 57, 0.5);
  }
  
  .npc-name {
    background-color: rgba(0, 0, 0, 0.7);
    color: gold;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.8rem;
    margin-top: 5px;
    transform: translateY(0);
    opacity: 0;
    transition: all 0.3s ease;
  }
  
  &:hover .npc-name {
    transform: translateY(5px);
    opacity: 1;
  }
`;

// NPC Quest indicator (floats above NPC)
const QuestIndicator = styled.div`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  background-color: gold;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-weight: bold;
  font-size: 14px;
  animation: pulse 1.5s infinite;
  
  @keyframes pulse {
    0% {
      transform: translateX(-50%) scale(1);
      box-shadow: 0 0 0 0 rgba(224, 166, 57, 0.7);
    }
    70% {
      transform: translateX(-50%) scale(1.1);
      box-shadow: 0 0 0 10px rgba(224, 166, 57, 0);
    }
    100% {
      transform: translateX(-50%) scale(1);
      box-shadow: 0 0 0 0 rgba(224, 166, 57, 0);
    }
  }
`;

// Dialog overlay that appears when clicking NPC
const Dialog = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

// Background container
const BackgroundContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #1a1a2e;
  z-index: 0;
`;

// Defining our NPCs
const npcs = [
  { id: 1, name: '长老', x: 25, y: 40, questAvailable: true },
  { id: 2, name: '商人', x: 65, y: 55, questAvailable: false },
  { id: 3, name: '铁匠', x: 80, y: 30, questAvailable: true },
  { id: 4, name: '法师', x: 45, y: 70, questAvailable: true },
];

const GameWorld: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Handle NPC click
  const handleNPCClick = () => {
    setDialogOpen(true);
  };

  // Handle opening the Today tab from HUD
  const handleOpenTodayTab = () => {
    setActiveTab('today');
    setDialogOpen(true);
  };

  return (
    <WorldContainer>
      <BackgroundContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Livion</h1>
            <p className="text-lg mb-4">Your gamified productivity app!</p>
            <p className="text-sm text-gray-600">Click on any NPC to see your tasks</p>
          </div>
        </div>
      </BackgroundContainer>
      
      {/* The NPCs in the world */}
      {npcs.map(npc => (
        <NPC 
          key={npc.id} 
          x={npc.x} 
          y={npc.y} 
          onClick={handleNPCClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="npc-avatar">
            {npc.questAvailable && <QuestIndicator>!</QuestIndicator>}
          </div>
          <div className="npc-name">{npc.name}</div>
        </NPC>
      ))}

      {/* Today's tasks HUD */}
      <TodayTasksHUD onOpenTodayTab={handleOpenTodayTab} />

      {/* Task dialog that appears when clicking an NPC */}
      <AnimatePresence>
        {dialogOpen && (
          <Dialog
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDialogOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              style={{ width: '90%', maxWidth: '1000px', height: '80vh', background: '#333', borderRadius: '8px' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <TaskTabs initialTab={activeTab} />
            </motion.div>
          </Dialog>
        )}
      </AnimatePresence>
    </WorldContainer>
  );
};

export default GameWorld; 