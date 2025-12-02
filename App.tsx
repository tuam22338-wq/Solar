
import React, { useState, useCallback, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import TrainRagScreen from './components/TrainRagScreen';
import { WorldConfig, GameState, AppSettings } from './types';
import { DEFAULT_WORLD_TIME, DEFAULT_PLAYER_ANALYSIS, DEFAULT_SETTINGS } from './constants';
import { getSettings, saveSettings } from './services/settingsService';

type Screen = 'home' | 'create' | 'settings' | 'gameplay' | 'train';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [editingConfig, setEditingConfig] = useState<WorldConfig | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // --- SETTINGS & ZOOM INITIALIZATION ---
  useEffect(() => {
    const loaded = getSettings();
    setAppSettings(loaded);
    
    let initialZoom = 1.0;
    if (loaded.uiSettings.zoomLevel && loaded.uiSettings.zoomLevel !== 1.0) {
        initialZoom = loaded.uiSettings.zoomLevel;
    } else {
        // Default to 1.0 (Mobile Native) if not set. 
        // Previously defaulted to 0.5, but user feedback suggests inversion confusion.
        // Let's rely on explicit user choice.
        initialZoom = 1.0;
    }
    setZoomLevel(initialZoom);
  }, []);

  const updateSettings = useCallback((newSettings: AppSettings) => {
      setAppSettings(newSettings);
      saveSettings(newSettings);
      // Apply Zoom immediately if changed
      if (newSettings.uiSettings.zoomLevel) {
          setZoomLevel(newSettings.uiSettings.zoomLevel);
      }
  }, []);

  // --- HARDWARE ZOOM EVENTS (Ctrl+Wheel / Ctrl+Keys) ---
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
          if (e.ctrlKey) {
              e.preventDefault(); // STOP BROWSER NATIVE ZOOM
              const delta = e.deltaY * -0.001;
              const newZoom = Math.min(Math.max(zoomLevel + delta, 0.4), 1.5);
              setZoomLevel(newZoom);
              // Update settings to match
              updateSettings({
                  ...appSettings,
                  uiSettings: { ...appSettings.uiSettings, zoomLevel: newZoom }
              });
          }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey) {
              if (e.key === '=' || e.key === '+') {
                  e.preventDefault();
                  const newZoom = Math.min(zoomLevel + 0.1, 1.5);
                  setZoomLevel(newZoom);
                  updateSettings({ ...appSettings, uiSettings: { ...appSettings.uiSettings, zoomLevel: newZoom } });
              }
              if (e.key === '-') {
                  e.preventDefault();
                  const newZoom = Math.max(zoomLevel - 0.1, 0.4);
                  setZoomLevel(newZoom);
                  updateSettings({ ...appSettings, uiSettings: { ...appSettings.uiSettings, zoomLevel: newZoom } });
              }
              if (e.key === '0') {
                  e.preventDefault();
                  setZoomLevel(1.0);
                  updateSettings({ ...appSettings, uiSettings: { ...appSettings.uiSettings, zoomLevel: 1.0 } });
              }
          }
      };

      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('keydown', handleKeyDown);

      return () => {
          window.removeEventListener('wheel', handleWheel);
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [zoomLevel, appSettings, updateSettings]);

  // --- CLEAN UP BODY STYLES ---
  useEffect(() => {
      (document.body.style as any).zoom = '';
      document.body.style.transform = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = 'hidden'; 
  }, []);

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
        return <SettingsScreen onBack={handleBackToHome} settings={appSettings} onUpdateSettings={updateSettings} />;
      case 'train':
        return <TrainRagScreen onBack={handleBackToHome} />;
      case 'gameplay':
        if (gameState) {
          // If zoom is less than 0.9, we assume desktop scaling mode.
          const isDesktopMode = zoomLevel < 0.9;
          return <GameplayScreen 
             initialGameState={gameState} 
             onBack={handleBackToHome} 
             textSize={appSettings.uiSettings.textSize} 
             isDesktopMode={isDesktopMode}
          />;
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

      {/* 2. SCALABLE CONTENT LAYER */}
      <div 
        className="relative z-10 overflow-auto"
        style={{
            // Scale the content to fit the viewport based on zoom level
            transform: `scale(${zoomLevel})`,
            // Inverse width to ensure it fills the visual screen
            width: `${100 / zoomLevel}%`,
            height: `${100 / zoomLevel}%`,
            transformOrigin: 'top left'
        }}
      >
          {renderScreen()}
      </div>
    </main>
  );
};

export default App;
    