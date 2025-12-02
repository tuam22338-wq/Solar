
import React, { useState, useCallback, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import TrainRagScreen from './components/TrainRagScreen';
import { WorldConfig, GameState } from './types';
import { DEFAULT_WORLD_TIME, DEFAULT_PLAYER_ANALYSIS } from './constants';
import { getSettings } from './services/settingsService';

type Screen = 'home' | 'create' | 'settings' | 'gameplay' | 'train';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [editingConfig, setEditingConfig] = useState<WorldConfig | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  useEffect(() => {
    const settings = getSettings();
    let initialZoom = 1.0;

    if (settings.uiSettings.zoomLevel && settings.uiSettings.zoomLevel !== 1.0) {
        initialZoom = settings.uiSettings.zoomLevel;
    } else {
        // Auto-detect if no custom setting is saved
        const isMobile = window.innerWidth < 768;
        initialZoom = isMobile ? 0.6 : 1.0;
    }
    setZoomLevel(initialZoom);
  }, []);

  // Apply Zoom via Root Font Size (REM scaling)
  // This is the most robust way to scale Tailwind apps across browsers (including Firefox)
  // without breaking fixed positioning (modals) or layout flow.
  useEffect(() => {
      const baseFontSize = 16; // Standard browser default is 16px
      const scaledFontSize = baseFontSize * zoomLevel;
      document.documentElement.style.fontSize = `${scaledFontSize}px`;
  }, [zoomLevel]);

  const handleZoomChange = (newZoom: number) => {
      setZoomLevel(newZoom);
  };

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
        playerAnalysis: DEFAULT_PLAYER_ANALYSIS,
        codex: [] // Initialize empty codex
    });
    setCurrentScreen('gameplay');
  }, []);

  const handleLoadSavedGame = useCallback((state: GameState) => {
    // Ensure compatibility with old saves by adding default new fields if missing
    const upgradedState = {
        ...state,
        worldTime: state.worldTime && state.worldTime.year ? state.worldTime : DEFAULT_WORLD_TIME,
        weather: state.weather || 'Sunny',
        questLog: state.questLog || [],
        playerAnalysis: state.playerAnalysis || DEFAULT_PLAYER_ANALYSIS,
        codex: state.codex || []
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
        return <SettingsScreen onBack={handleBackToHome} onZoomChange={handleZoomChange} />;
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
    <main className="relative min-h-[100dvh] w-full text-slate-100 font-sans selection:bg-fuchsia-500/30 bg-slate-950">
      
      {/* Dynamic Background - Fixed Position */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none h-full w-full">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/40 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
         <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-fuchsia-900/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{animationDuration: '4s'}}></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-[100dvh] transition-all duration-300">
        {renderScreen()}
      </div>
    </main>
  );
};

export default App;
