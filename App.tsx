
import React, { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import TrainRagScreen from './components/TrainRagScreen';
import { WorldConfig, GameState } from './types';
import { DEFAULT_WORLD_TIME, DEFAULT_PLAYER_ANALYSIS } from './constants';

type Screen = 'home' | 'create' | 'settings' | 'gameplay' | 'train';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [editingConfig, setEditingConfig] = useState<WorldConfig | null>(null);

  const handleStartNew = useCallback(() => {
    setEditingConfig(null);
    setCurrentScreen('create');
  }, []);

  const handleLoadGame = useCallback((config: WorldConfig) => {
    setEditingConfig(config);
    setCurrentScreen('create');
  }, []);
  
  const handleStartGame = useCallback((config: WorldConfig) => {
    setGameState({ 
        worldConfig: config, 
        history: [],
        worldTime: DEFAULT_WORLD_TIME,
        weather: 'Sunny',
        questLog: [],
        playerAnalysis: DEFAULT_PLAYER_ANALYSIS
    });
    setCurrentScreen('gameplay');
  }, []);

  const handleLoadSavedGame = useCallback((state: GameState) => {
    // Ensure compatibility with old saves by adding default new fields if missing
    const upgradedState = {
        ...state,
        worldTime: state.worldTime || DEFAULT_WORLD_TIME,
        weather: state.weather || 'Sunny',
        questLog: state.questLog || [],
        playerAnalysis: state.playerAnalysis || DEFAULT_PLAYER_ANALYSIS
    };
    setGameState(upgradedState);
    setCurrentScreen('gameplay');
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);
  
  const handleNavigateToTrain = useCallback(() => {
      setCurrentScreen('train');
  }, []);

  const handleBackToHome = useCallback(() => {
    setGameState(null);
    setEditingConfig(null);
    setCurrentScreen('home');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'create':
        return <WorldCreationScreen onBack={handleBackToHome} initialConfig={editingConfig} onStartGame={handleStartGame} />;
      case 'settings':
        return <SettingsScreen onBack={handleBackToHome} />;
      case 'train':
        return <TrainRagScreen onBack={handleBackToHome} />;
      case 'gameplay':
        if (gameState) {
          return <GameplayScreen initialGameState={gameState} onBack={handleBackToHome} />;
        }
        setCurrentScreen('home');
        return null;
      case 'home':
      default:
        return (
          <HomeScreen
            onStartNew={handleStartNew}
            onLoadGame={handleLoadGame}
            onLoadSavedGame={handleLoadSavedGame}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToTrain={handleNavigateToTrain}
          />
        );
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full text-slate-100 font-sans selection:bg-fuchsia-500/30">
      {/* Dynamic Background - Fixed Position to avoid gaps */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-slate-950 h-screen w-screen">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/40 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
         <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-fuchsia-900/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{animationDuration: '4s'}}></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        {renderScreen()}
      </div>
    </main>
  );
};

export default App;
