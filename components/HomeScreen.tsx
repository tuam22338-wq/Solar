
import React, { useRef, useState, useEffect } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import { WorldConfig, GameState } from '../types';
import { loadWorldConfigFromFile } from '../services/fileService';
import * as gameService from '../services/gameService';
import LoadGameModal from './LoadGameModal';
import NotificationModal from './common/NotificationModal';
import { useStore } from '../store/useStore';

interface HomeScreenProps {
    onStartNew?: () => void;
    onLoadGame?: (config: WorldConfig) => void;
    onNavigateToSettings?: () => void;
    onNavigateToTrain?: () => void;
    onLoadSavedGame?: (state: GameState) => void;
}

type ColorVariant = 'fuchsia' | 'cyan' | 'emerald' | 'amber' | 'indigo' | 'rose';

const MenuCard: React.FC<{ 
    onClick: () => void; 
    icon: any; 
    title: string; 
    description: string; 
    variant: ColorVariant;
    delay?: string;
    isActive?: boolean;
    disabled?: boolean;
}> = ({ onClick, icon, title, description, variant, delay = "0s", isActive = true, disabled = false }) => {
    
    const colorStyles: Record<ColorVariant, { 
        border: string, 
        iconBg: string, 
        iconColor: string, 
        hoverShadow: string, 
        hoverBorder: string,
        glow: string 
    }> = {
        fuchsia: {
            border: 'border-fuchsia-500/20',
            iconBg: 'bg-fuchsia-500/20',
            iconColor: 'text-fuchsia-300',
            hoverShadow: 'hover:shadow-fuchsia-500/20',
            hoverBorder: 'hover:border-fuchsia-500/60',
            glow: 'from-fuchsia-600/20 to-purple-600/5'
        },
        cyan: {
            border: 'border-cyan-500/20',
            iconBg: 'bg-cyan-500/20',
            iconColor: 'text-cyan-300',
            hoverShadow: 'hover:shadow-cyan-500/20',
            hoverBorder: 'hover:border-cyan-500/60',
            glow: 'from-cyan-600/20 to-sky-600/5'
        },
        emerald: {
            border: 'border-emerald-500/20',
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-300',
            hoverShadow: 'hover:shadow-emerald-500/20',
            hoverBorder: 'hover:border-emerald-500/60',
            glow: 'from-emerald-600/20 to-teal-600/5'
        },
        amber: {
            border: 'border-amber-500/20',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-300',
            hoverShadow: 'hover:shadow-amber-500/20',
            hoverBorder: 'hover:border-amber-500/60',
            glow: 'from-amber-600/20 to-orange-600/5'
        },
        indigo: {
            border: 'border-indigo-500/20',
            iconBg: 'bg-indigo-500/20',
            iconColor: 'text-indigo-300',
            hoverShadow: 'hover:shadow-indigo-500/20',
            hoverBorder: 'hover:border-indigo-500/60',
            glow: 'from-indigo-600/20 to-violet-600/5'
        },
        rose: {
            border: 'border-rose-500/20',
            iconBg: 'bg-rose-500/20',
            iconColor: 'text-rose-300',
            hoverShadow: 'hover:shadow-rose-500/20',
            hoverBorder: 'hover:border-rose-500/60',
            glow: 'from-rose-600/20 to-pink-600/5'
        }
    };

    const style = colorStyles[variant];

    return (
        <button 
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{ animationDelay: delay }}
            className={`
                group relative flex items-center gap-5 p-5 rounded-2xl border text-left w-full transition-all duration-300 animate-fade-in-up overflow-hidden
                ${disabled 
                    ? 'glass-panel opacity-40 cursor-not-allowed border-white/5 grayscale' 
                    : `glass-panel ${style.border} ${style.hoverBorder} hover:bg-slate-800/80 hover:-translate-y-1 hover:shadow-2xl ${style.hoverShadow}` 
                }
            `}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${style.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
            <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-inner
                ${isActive ? `${style.iconBg} ${style.iconColor} group-hover:scale-110` : 'bg-slate-800 text-slate-600'}
            `}>
                <Icon name={icon} className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <h3 className={`text-lg font-bold mb-0.5 transition-colors ${isActive ? 'text-slate-100' : 'text-slate-500'}`}>{title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed truncate group-hover:text-slate-300">{description}</p>
            </div>
            <div className={`relative z-10 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 ${style.iconColor}`}>
                 <Icon name="play" className="w-4 h-4" />
            </div>
        </button>
    );
};

// ... (RotatingSunIcon kept same) ...
const RotatingSunIcon: React.FC<{className?: string}> = ({className}) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" stopColor="#f5d0fe" /> 
        <stop offset="100%" stopColor="#c026d3" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g filter="url(#glow)">
        <circle cx="50" cy="50" r="20" fill="url(#sunGradient)" opacity="0.9" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (<rect key={i} x="46" y="10" width="8" height="12" rx="4" fill="#e879f9" transform={`rotate(${angle} 50 50)`} opacity="0.8"/>))}
        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => (<rect key={i} x="48" y="18" width="4" height="8" rx="2" fill="#f0abfc" transform={`rotate(${angle} 50 50)`} opacity="0.6"/>))}
    </g>
  </svg>
);


const HomeScreen: React.FC<HomeScreenProps> = () => {
  const { setScreen, setEditingConfig, loadSavedGame } = useStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasSaveFile, setHasSaveFile] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    setHasSaveFile(gameService.hasSavedGames());
  }, []);

  const handleLoadFromJson = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const config = await loadWorldConfigFromFile(file);
        setEditingConfig(config);
        setScreen('create');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Lỗi không xác định');
      }
    }
    if(event.target) {
      event.target.value = '';
    }
  };

  return (
    <>
      <LoadGameModal 
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={loadSavedGame}
      />
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        title="Tính năng đang phát triển"
        messages={['Chức năng này hiện chưa hoàn thiện và sẽ sớm được cập nhật trong các phiên bản sau.']}
      />
      
      <div className="flex flex-col h-full min-h-full w-full relative z-10">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl mx-auto flex flex-col items-center animate-fade-in-up">
                
                {/* Hero Section */}
                <div className="text-center space-y-6 mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/5 backdrop-blur-md text-fuchsia-300 text-[10px] font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse"></span>
                        Gemini AI Powered 2.5
                    </div>
                    
                    <div className="relative flex items-center justify-center">
                        <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 drop-shadow-2xl flex items-center gap-1">
                            <div className="relative w-16 h-16 md:w-28 md:h-28 -mr-2 md:-mr-4 z-10">
                                <RotatingSunIcon className="w-full h-full animate-spin-slow" />
                            </div>
                            <span>SOLARIS</span>
                        </h1>
                    </div>

                    <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
                        Hệ thống giả lập nhập vai kiến tạo thế giới, nơi mọi quyết định của bạn đều xoay vần vận mệnh.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                    <div className="md:col-span-2">
                        <MenuCard 
                            onClick={() => { setEditingConfig(null); setScreen('create'); }} 
                            icon="play" 
                            title="Khởi Tạo Thế Giới Mới" 
                            description="Bắt đầu hành trình mới. Tùy chỉnh bối cảnh, nhân vật và luật lệ."
                            variant="fuchsia"
                            delay="0.1s"
                        />
                    </div>
                    
                    <MenuCard 
                        onClick={() => { if(hasSaveFile) setIsLoadModalOpen(true); }}
                        icon="save" 
                        title="Tiếp Tục Hành Trình" 
                        description="Tải lại bản lưu gần nhất của bạn."
                        variant="cyan"
                        isActive={hasSaveFile}
                        disabled={!hasSaveFile}
                        delay="0.2s"
                    />

                    <MenuCard 
                        onClick={() => setScreen('train')}
                        icon="cpu" 
                        title="Train RAG System" 
                        description="Xử lý dữ liệu thô (.txt) để nhập vào Knowledge."
                        variant="rose"
                        delay="0.3s"
                    />

                    <MenuCard 
                        onClick={() => setScreen('settings')} 
                        icon="settings" 
                        title="Cấu Hình Hệ Thống" 
                        description="API Key, An toàn & Tùy chỉnh."
                        variant="indigo"
                        delay="0.4s"
                    />

                    <MenuCard 
                        onClick={handleLoadFromJson} 
                        icon="upload" 
                        title="Nhập Config (.json)" 
                        description="Tải thế giới từ file chia sẻ."
                        variant="emerald"
                        delay="0.5s"
                    />
                </div>
            </div>
        </div>

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
        />
        
        <div className="p-6 text-center">
            <div className="inline-block text-[10px] font-mono tracking-widest uppercase text-slate-600 border-t border-white/5 pt-2 px-4">
                Designed for Google Gemini 2.5 Flash
            </div>
        </div>
      </div>
    </>
  );
};

export default HomeScreen;
