
import React, { useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import TrainRagScreen from './components/TrainRagScreen';
import { useStore } from '../store/useStore';

const App: React.FC = () => {
  const { currentScreen, zoomLevel, setZoomLevel, setScreen } = useStore();

  // --- HARDWARE ZOOM EVENTS (Ctrl+Wheel / Ctrl+Keys) ---
  useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
          if (e.ctrlKey) {
              e.preventDefault(); 
              const delta = e.deltaY * -0.001;
              const current = useStore.getState().zoomLevel; // Access direct state to avoid stale closure
              setZoomLevel(Math.min(Math.max(current + delta, 0.5), 1.5));
          }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey) {
              const current = useStore.getState().zoomLevel;
              if (e.key === '=' || e.key === '+') {
                  e.preventDefault();
                  setZoomLevel(Math.min(current + 0.1, 1.5));
              }
              if (e.key === '-') {
                  e.preventDefault();
                  setZoomLevel(Math.max(current - 0.1, 0.5));
              }
              if (e.key === '0') {
                  e.preventDefault();
                  setZoomLevel(1.0);
              }
          }
      };

      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('keydown', handleKeyDown);

      return () => {
          window.removeEventListener('wheel', handleWheel);
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [setZoomLevel]);

  // --- CLEAN UP BODY STYLES ---
  useEffect(() => {
      (document.body.style as any).zoom = '';
      document.body.style.transform = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = 'hidden'; 
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'create': return <WorldCreationScreen onBack={() => setScreen('home')} />;
      case 'settings': return <SettingsScreen onBack={() => setScreen('home')} />;
      case 'train': return <TrainRagScreen onBack={() => setScreen('home')} />;
      case 'gameplay': return <GameplayScreen onBack={() => setScreen('home')} />;
      case 'home':
      default: return <HomeScreen />;
    }
  };

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-slate-950">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none w-screen h-screen">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/40 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/30 rounded-full mix-blend-screen filter blur-[100px]"></div>
         <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-fuchsia-900/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{animationDuration: '4s'}}></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div 
        className="relative z-10 overflow-auto"
        style={{
            transform: `scale(${zoomLevel})`,
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
