import React from 'react';
import { AppContainer } from './components/ui/StyledElements';
import { ThemeProvider } from './components/layout/ThemeProvider';
import { TaskProvider } from './context/TaskContext';
import GameWorld from './components/layout/GameWorld';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TaskProvider>
        <AppContainer>
          <GameWorld />
        </AppContainer>
      </TaskProvider>
    </ThemeProvider>
  );
};

export default App;
