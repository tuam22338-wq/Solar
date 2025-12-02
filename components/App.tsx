
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

  // --- ZOOM INITIALIZATION ---
  useEffect(() => {
    const settings = getSettings();
    let initialZoom = 1.0;

    if (settings.uiSettings.zoomLevel && settings.uiSettings.zoomLevel !== 1.0) {
        initialZoom = settings.uiSettings.zoomLevel;
    } else {
        // Auto-detect mobile
        const isMobile = window.innerWidth < 768;
        initialZoom = isMobile ? 0.6 : 1.0;
    }
    setZoomLevel(initialZoom);
  }, []);

  // --- HARDWARE ZOOM EVENTS (Ctrl+Wheel / Ctrl+Keys) ---
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
          if (e.ctrlKey) {
              e.preventDefault(); // STOP BROWSER NATIVE ZOOM
              const delta = e.deltaY * -0.001;
              setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.5), 1.5));
          }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey) {
              if (e.key === '=' || e.key === '+') {
                  e.preventDefault();
                  setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
              }
              if (e.key === '-') {
                  e.preventDefault();
                  setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
              }
              if (e.key === '0') {
                  e.preventDefault();
                  setZoomLevel(1.0);
              }
          }
      };

      // Passive: false is CRITICAL for preventing default browser behavior
      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('keydown', handleKeyDown);

      return () => {
          window.removeEventListener('wheel', handleWheel);
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, []);

  // --- CLEAN UP BODY STYLES ---
  useEffect(() => {
      (document.body.style as any).zoom = '';
      document.body.style.transform = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = 'hidden'; // Ensure no double scrollbars
  }, []);

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
        codex: [] 
    });
    setCurrentScreen('gameplay');
  }, []);

  const handleLoadSavedGame = useCallback((state: GameState) => {
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
        // FIX: Pass currentZoom prop to sync slider with hardware events
        return <SettingsScreen onBack={handleBackToHome} onZoomChange={handleZoomChange} currentZoom={zoomLevel} />;
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
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      
      {/* 1. FIXED BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none w-screen h-screen">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/40 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
         <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-fuchsia-900/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{animationDuration: '4s'}}></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* 2. SCALABLE CONTENT LAYER (The "Inverse Scaling" Magic) */}
      <div 
        className="relative z-10 overflow-auto"
        style={{
            // Scale the content
            transform: `scale(${zoomLevel})`,
            // Compensate size: If zoom is 0.5 (small), make width 200% so it still fills the screen
            width: `${100 / zoomLevel}%`,
            height: `${100 / zoomLevel}%`,
            // Pin to top left so coordinate system stays sane
            transformOrigin: 'top left'
        }}
      >
          {renderScreen()}
      </div>
    </main>
  );
};

export default App;
