

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { WorldConfig, InitialEntity, CustomStat, Rank, ProgressionSystem, KnowledgeBase, CodexEntry, AdvancedRules } from '../types';
import { 
    DEFAULT_WORLD_CONFIG, 
    GENDER_OPTIONS, 
    PERSONALITY_OPTIONS,
    DIFFICULTY_OPTIONS,
    STARTING_SCENARIO_OPTIONS,
    PROGRESSION_TEMPLATES,
    ENTITY_TYPE_OPTIONS,
    PERSPECTIVE_OPTIONS,
    SEXUAL_CONTENT_STYLE_OPTIONS,
    VIOLENCE_LEVEL_OPTIONS,
    STORY_TONE_OPTIONS
} from '../constants';
import * as aiService from '../services/aiService';
import { getSettings, saveSettings } from '../services/settingsService';
import Icon from './common/Icon';
import Button from './common/Button';
import { saveWorldConfigToFile } from '../services/fileService';
import AiAssistButton from './common/AiAssistButton';
import ApiKeyModal from './common/ApiKeyModal';
import NotificationModal from './common/NotificationModal';
import Accordion from './common/Accordion';
import { useStore } from '../store/useStore';
import ToggleSwitch from './common/ToggleSwitch';

type ThemeColor = 'indigo' | 'emerald' | 'fuchsia' | 'amber' | 'cyan' | 'rose';

interface ThemeStyles {
    name: ThemeColor;
    bg: string;
    border: string;
    text: string;
    label: string;
    ring: string;
    iconBg: string;
    gradient: string;
}

const TAB_THEMES: Record<string, ThemeStyles> = {
    general: {
        name: 'indigo',
        bg: 'bg-indigo-950/30',
        border: 'border-indigo-500/20',
        text: 'text-indigo-200',
        label: 'text-indigo-400',
        ring: 'focus:border-indigo-500/60 focus:ring-indigo-500/20',
        iconBg: 'bg-indigo-500/20 text-indigo-300',
        gradient: 'from-indigo-500 to-violet-600'
    },
    world: {
        name: 'emerald',
        bg: 'bg-emerald-950/30',
        border: 'border-emerald-500/20',
        text: 'text-emerald-200',
        label: 'text-emerald-400',
        ring: 'focus:border-emerald-500/60 focus:ring-emerald-500/20',
        iconBg: 'bg-emerald-500/20 text-emerald-300',
        gradient: 'from-emerald-500 to-teal-600'
    },
    character: {
        name: 'fuchsia',
        bg: 'bg-fuchsia-950/30',
        border: 'border-fuchsia-500/20',
        text: 'text-fuchsia-200',
        label: 'text-fuchsia-400',
        ring: 'focus:border-fuchsia-500/60 focus:ring-fuchsia-500/20',
        iconBg: 'bg-fuchsia-500/20 text-fuchsia-300',
        gradient: 'from-fuchsia-500 to-pink-600'
    },
    progression: {
        name: 'rose',
        bg: 'bg-rose-950/30',
        border: 'border-rose-500/20',
        text: 'text-rose-200',
        label: 'text-rose-400',
        ring: 'focus:border-rose-500/60 focus:ring-rose-500/20',
        iconBg: 'bg-rose-500/20 text-rose-300',
        gradient: 'from-rose-500 to-red-600'
    },
    assets: {
        name: 'amber',
        bg: 'bg-amber-950/30',
        border: 'border-amber-500/20',
        text: 'text-amber-200',
        label: 'text-amber-400',
        ring: 'focus:border-amber-500/60 focus:ring-amber-500/20',
        iconBg: 'bg-amber-500/20 text-amber-300',
        gradient: 'from-amber-500 to-orange-600'
    },
    narrative: {
        name: 'cyan',
        bg: 'bg-cyan-950/30',
        border: 'border-cyan-500/20',
        text: 'text-cyan-200',
        label: 'text-cyan-400',
        ring: 'focus:border-cyan-500/60 focus:ring-cyan-500/20',
        iconBg: 'bg-cyan-500/20 text-cyan-300',
        gradient: 'from-cyan-500 to-sky-600'
    }
};

const GlassSection: React.FC<{ children: React.ReactNode, theme: ThemeStyles, className?: string }> = ({ children, theme, className = '' }) => (
    <div className={`backdrop-blur-xl rounded-3xl border shadow-xl ${theme.bg} ${theme.border} p-6 md:p-8 animate-fade-in-up ${className}`}>
        {children}
    </div>
);

const GlassInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { theme: ThemeStyles }>(
  ({ theme, className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-slate-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-300 focus:outline-none focus:bg-slate-900/80 focus:ring-2 shadow-inner ${theme.ring} ${className}`}
      {...props}
    />
  )
);

const GlassSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { theme: ThemeStyles }> = ({ theme, children, className = '', ...props }) => (
    <div className="relative">
        <select
          className={`w-full appearance-none bg-slate-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-100 transition-all duration-300 focus:outline-none focus:bg-slate-900/80 focus:ring-2 shadow-inner cursor-pointer ${theme.ring} ${className}`}
          {...props}
        >
            {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <Icon name="arrowDown" className="w-4 h-4" />
        </div>
    </div>
);

const SectionLabel: React.FC<{ icon: any, label: string, theme: ThemeStyles }> = ({ icon, label, theme }) => (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-2 ${theme.label}`}>
        <Icon name={icon} className="w-3.5 h-3.5" />
        {label}
    </div>
);

const Header: React.FC<{ title: string, subtitle: string, theme: ThemeStyles }> = ({ title, subtitle, theme }) => (
    <div className="mb-8">
        <h2 className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient}`}>{title}</h2>
        <p className={`text-sm mt-1 font-medium ${theme.text} opacity-80`}>{subtitle}</p>
    </div>
);


interface WorldCreationScreenProps {
  onBack: () => void;
  // initialConfig & onStartGame are now handled via store but we can keep props for compatibility or internal use
  initialConfig?: WorldConfig | null; 
  onStartGame?: (config: WorldConfig) => void;
}

type Tab = 'general' | 'world' | 'character' | 'progression' | 'assets' | 'narrative';
type LoadingStates = { [key: string]: boolean };

const WorldCreationScreen: React.FC<WorldCreationScreenProps> = ({ onBack }) => {
  // Use Zustand Store
  const { startNewGame, editingConfig } = useStore();
  
  const [config, setConfig] = useState<WorldConfig>(DEFAULT_WORLD_CONFIG);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [storyIdea, setStoryIdea] = useState('');
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [retryAiTask, setRetryAiTask] = useState<(() => void) | null>(null);
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ title: '', messages: [''] });

  const [isQuickAiModalOpen, setIsQuickAiModalOpen] = useState(false);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);
  
  const isSafetyFilterEnabled = getSettings().safetySettings.enabled;
  const currentTheme = TAB_THEMES[activeTab];

  useEffect(() => {
    const initConf = editingConfig;
    if (initConf) {
      setConfig(prev => ({
          ...DEFAULT_WORLD_CONFIG, 
          ...initConf,
          worldLore: { ...DEFAULT_WORLD_CONFIG.worldLore, ...(initConf.worldLore || {}) },
          character: { 
              ...DEFAULT_WORLD_CONFIG.character, 
              ...initConf.character,
              inventory: initConf.character?.inventory || [],
              relationships: initConf.character?.relationships || [],
              customStats: initConf.character?.customStats || []
          },
          writingConfig: { ...DEFAULT_WORLD_CONFIG.writingConfig, ...(initConf.writingConfig || {}) },
          progressionSystem: initConf.progressionSystem || DEFAULT_WORLD_CONFIG.progressionSystem,
          advancedRules: { ...DEFAULT_WORLD_CONFIG.advancedRules, ...(initConf.advancedRules || {}) },
          initialCodex: initConf.initialCodex || []
      }));
    } else {
      setConfig(DEFAULT_WORLD_CONFIG);
    }
  }, [editingConfig]);

  const handleSimpleChange = useCallback(<T extends keyof WorldConfig>(key: T, value: WorldConfig[T]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleNestedChange = useCallback(<T extends keyof WorldConfig, U extends keyof WorldConfig[T]>(parentKey: T, childKey: U, value: WorldConfig[T][U]) => {
    setConfig(prev => ({ ...prev, [parentKey]: { ...(prev[parentKey] as object), [childKey]: value } }));
  }, []);
  
  const handleLoreChange = useCallback(<T extends keyof WorldConfig['worldLore']>(key: T, value: WorldConfig['worldLore'][T]) => {
      setConfig(prev => ({ ...prev, worldLore: { ...prev.worldLore, [key]: value } }));
  }, []);

  const handleAdvancedRuleChange = useCallback((key: keyof AdvancedRules, value: boolean) => {
      setConfig(prev => ({ ...prev, advancedRules: { ...prev.advancedRules, [key]: value } }));
  }, []);

  const executeAiTask = async (task: () => Promise<void>) => {
    try { await task(); } 
    catch (error) {
      const msg = error instanceof Error ? error.message : "Lỗi không xác định";
      if (msg.includes('Không tìm thấy API Key nào')) {
        setRetryAiTask(() => task);
        setIsApiKeyModalOpen(true);
      } else {
        setNotificationContent({ title: 'Lỗi AI', messages: [msg] });
        setIsNotificationOpen(true);
      }
    }
  };

  const runAiAssist = (field: string, action: () => Promise<any>, setter: (result: any) => void) => {
    executeAiTask(async () => {
      setLoadingStates(p => ({ ...p, [field]: true }));
      try { const result = await action(); setter(result); } 
      finally { setLoadingStates(p => ({ ...p, [field]: false })); }
    });
  };

  const handleGenerateWorldFromIdea = useCallback(() => {
    if (!storyIdea.trim()) {
      setNotificationContent({ title: 'Thiếu ý tưởng', messages: ['Vui lòng nhập ý tưởng để AI bắt đầu.'] });
      setIsNotificationOpen(true);
      return;
    }
    executeAiTask(async () => {
      setLoadingStates(p => ({...p, worldIdea: true}));
      try {
        const newConfig = await aiService.generateWorldFromIdea(storyIdea);
        setConfig(prev => ({
            ...DEFAULT_WORLD_CONFIG, 
            ...prev, 
            ...newConfig, 
            storyContext: { ...DEFAULT_WORLD_CONFIG.storyContext, ...(newConfig.storyContext || {}) },
            worldLore: { ...DEFAULT_WORLD_CONFIG.worldLore, ...(newConfig.worldLore || {}) },
            character: { 
                ...DEFAULT_WORLD_CONFIG.character, 
                ...(newConfig.character || {}),
                inventory: newConfig.character?.inventory || [],
                relationships: newConfig.character?.relationships || [],
                customStats: newConfig.character?.customStats || []
            },
            progressionSystem: newConfig.progressionSystem || prev.progressionSystem,
            advancedRules: prev.advancedRules, // Maintain current rules or add AI logic later
            initialEntities: newConfig.initialEntities || []
        }));
        setNotificationContent({ title: 'Hoàn tất', messages: ["AI đã kiến tạo thế giới toàn diện. Hãy kiểm tra lại các tab."] });
        setIsNotificationOpen(true);
        setActiveTab('world'); 
        setIsQuickAiModalOpen(false); 
      } finally {
        setLoadingStates(p => ({...p, worldIdea: false}));
      }
    });
  }, [storyIdea]);

  const validateAndStart = () => {
     const missing: string[] = [];
     if (!config.storyContext.genre) missing.push('Thể loại');
     if (!config.character.name) missing.push('Tên nhân vật');
     if (missing.length > 0) {
        setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng điền:', ...missing] });
        setIsNotificationOpen(true);
        return;
     }
     startNewGame(config);
  };
  
  // Custom Stats Handlers
  const addCustomStat = () => {
      const newStat: CustomStat = { 
          id: `stat_${Date.now()}`, 
          name: '', 
          value: 100, 
          max: 100, 
          color: 'blue', 
          icon: 'magic',
          description: ''
      };
      setConfig(prev => ({
          ...prev, 
          character: { 
              ...prev.character, 
              customStats: [...prev.character.customStats, newStat] 
          }
      }));
  };
  
  const updateCustomStat = (index: number, field: keyof CustomStat, value: any) => {
      const newStats = [...config.character.customStats];
      newStats[index] = { ...newStats[index], [field]: value };
      setConfig(prev => ({
          ...prev, 
          character: { ...prev.character, customStats: newStats }
      }));
  };
  
  const removeCustomStat = (index: number) => {
      const newStats = config.character.customStats.filter((_, i) => i !== index);
      setConfig(prev => ({
          ...prev, 
          character: { ...prev.character, customStats: newStats }
      }));
  };
  
  const generateStatsByGenre = () => {
      executeAiTask(async () => {
          setLoadingStates(p => ({...p, stats: true}));
          try {
              const genre = config.storyContext.genre || "RPG";
              const stats = await aiService.generateCustomStats(genre);
              setConfig(prev => ({
                  ...prev, 
                  character: { ...prev.character, customStats: stats }
              }));
          } finally {
              setLoadingStates(p => ({...p, stats: false}));
          }
      });
  };

  // Progression Handlers
  const addRank = () => {
      const newRank: Rank = { id: `rank_${Date.now()}`, name: 'Cấp Mới', description: '', requirements: [] };
      setConfig(prev => ({
          ...prev,
          progressionSystem: { ...prev.progressionSystem, ranks: [...prev.progressionSystem.ranks, newRank] }
      }));
  };

  const updateRank = (index: number, field: keyof Rank, value: any) => {
      const newRanks = [...config.progressionSystem.ranks];
      newRanks[index] = { ...newRanks[index], [field]: value };
      setConfig(prev => ({ ...prev, progressionSystem: { ...prev.progressionSystem, ranks: newRanks } }));
  };

  const removeRank = (index: number) => {
      const newRanks = config.progressionSystem.ranks.filter((_, i) => i !== index);
      setConfig(prev => ({ ...prev, progressionSystem: { ...prev.progressionSystem, ranks: newRanks } }));
  };
  
  const applyProgressionTemplate = (key: keyof typeof PROGRESSION_TEMPLATES) => {
      const tmpl = PROGRESSION_TEMPLATES[key];
      setConfig(prev => ({
          ...prev,
          progressionSystem: { enabled: true, name: tmpl.name, ranks: [...tmpl.ranks] }
      }));
  };
  
  const generateProgression = () => {
       executeAiTask(async () => {
          setLoadingStates(p => ({...p, progression: true}));
          try {
              const genre = config.storyContext.genre || "RPG";
              const sys = await aiService.generateProgressionSystem(genre, config.character.customStats);
              setConfig(prev => ({ ...prev, progressionSystem: sys }));
          } finally {
              setLoadingStates(p => ({...p, progression: false}));
          }
      });
  };
  
  const addRequirement = (rankIndex: number) => {
      if (config.character.customStats.length === 0) {
          setNotificationContent({ 
              title: 'Chưa có chỉ số', 
              messages: ['Vui lòng tạo "Chỉ số tùy chỉnh" trong tab Nhân Vật trước khi thêm điều kiện cấp bậc.'] 
          });
          setIsNotificationOpen(true);
          return;
      }

      const newRanks = [...config.progressionSystem.ranks];
      const firstStatId = config.character.customStats[0].id;
      
      newRanks[rankIndex].requirements.push({ statId: firstStatId, value: 100 });
      setConfig(prev => ({ ...prev, progressionSystem: { ...prev.progressionSystem, ranks: newRanks } }));
  };

  const updateRequirement = (rankIndex: number, reqIndex: number, field: 'statId' | 'value', value: any) => {
       const newRanks = [...config.progressionSystem.ranks];
       newRanks[rankIndex].requirements[reqIndex] = { ...newRanks[rankIndex].requirements[reqIndex], [field]: value };
       setConfig(prev => ({ ...prev, progressionSystem: { ...prev.progressionSystem, ranks: newRanks } }));
  };
  
  const removeRequirement = (rankIndex: number, reqIndex: number) => {
       const newRanks = [...config.progressionSystem.ranks];
       newRanks[rankIndex].requirements = newRanks[rankIndex].requirements.filter((_, i) => i !== reqIndex);
       setConfig(prev => ({ ...prev, progressionSystem: { ...prev.progressionSystem, ranks: newRanks } }));
  };

  const handleKnowledgeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const kb = JSON.parse(text) as KnowledgeBase;
              
              if (!kb.chunks || !Array.isArray(kb.chunks)) throw new Error("Invalid Knowledge Base format");

              const newEntries: CodexEntry[] = kb.chunks.map((chunk, i) => ({
                  id: `rag_${Date.now()}_${i}`,
                  name: `${kb.name} [Frag ${i}]`,
                  type: 'Lore',
                  tags: ['RAG', kb.name],
                  description: chunk,
                  lastUpdated: new Date().toISOString(),
                  isNew: true
              }));

              const existingCodex = config.initialCodex || [];
              setConfig(prev => ({ ...prev, initialCodex: [...existingCodex, ...newEntries] }));
              
              setNotificationContent({ 
                  title: 'Import Thành Công', 
                  messages: [`Đã nạp ${newEntries.length} mảnh dữ liệu từ "${kb.name}".`, 'AI sẽ sử dụng dữ liệu này trong game.'] 
              });
              setIsNotificationOpen(true);

          } catch (err) {
              alert("Lỗi đọc file Knowledge: " + err);
          }
      };
      reader.readAsText(file);
      if(e.target) e.target.value = '';
  };

  const tabs: {id: Tab, label: string, icon: any, desc: string}[] = [
      { id: 'general', label: 'Cấu Hình', icon: 'settings', desc: 'Luật lệ & An toàn' },
      { id: 'world', label: 'Thế Giới', icon: 'world', desc: 'Bối cảnh & Lịch sử' },
      { id: 'character', label: 'Nhân Vật', icon: 'user', desc: 'Tiểu sử & Chỉ số' },
      { id: 'progression', label: 'Cấp Bậc', icon: 'arrowUp', desc: 'Thăng tiến & Cảnh giới' },
      { id: 'assets', label: 'Tài Sản', icon: 'quest', desc: 'Kho đồ & NPC' },
      { id: 'narrative', label: 'Kịch Bản', icon: 'news', desc: 'Lời dẫn & Khởi đầu' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      <ApiKeyModal isOpen={isApiKeyModalOpen} onSave={(key) => {
          const s = getSettings();
          saveSettings({ ...s, apiKeyConfig: { keys: [...s.apiKeyConfig.keys.filter(Boolean), key] } });
          setIsApiKeyModalOpen(false);
          if (retryAiTask) { retryAiTask(); setRetryAiTask(null); }
      }} onCancel={() => setIsApiKeyModalOpen(false)} />
      
      <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} title={notificationContent.title} messages={notificationContent.messages} />

      {/* Quick AI Modal */}
      {isQuickAiModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsQuickAiModalOpen(false)}>
              <div className="glass-panel p-6 rounded-3xl w-full max-w-md shadow-2xl border border-fuchsia-500/20" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                           <Icon name="magic" className="w-5 h-5"/>
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-white leading-none">AI Khởi Tạo Nhanh</h3>
                          <p className="text-xs text-slate-400 mt-1">Biến ý tưởng thành thế giới hoàn chỉnh.</p>
                      </div>
                  </div>
                  <textarea 
                      value={storyIdea} 
                      onChange={(e) => setStoryIdea(e.target.value)} 
                      placeholder="VD: Một thế giới cyberpunk nơi mưa không bao giờ dứt, nhân vật là thám tử tư..." 
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-sm h-32 mb-4 focus:outline-none focus:border-fuchsia-500/50 resize-none placeholder:text-slate-600 text-slate-200"
                  />
                  <div className="flex gap-3">
                      <Button onClick={() => setIsQuickAiModalOpen(false)} variant="ghost" className="flex-1">Hủy</Button>
                      <AiAssistButton 
                          isLoading={loadingStates['worldIdea']} 
                          onClick={handleGenerateWorldFromIdea} 
                          isFullWidth 
                          className="flex-1 !py-3 !rounded-xl"
                      >
                          Tạo Thế Giới
                      </AiAssistButton>
                  </div>
              </div>
          </div>
      )}

      {/* Header Bar */}
      <header className="h-16 flex-shrink-0 glass-panel border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20 relative">
          <div className="flex items-center gap-2 md:gap-4">
              <Button onClick={onBack} variant="ghost" fullWidth={false} className="!p-2 hover:bg-white/10 rounded-full"><Icon name="back" className="w-5 h-5"/></button>
              <h1 className="text-lg font-bold tracking-tight hidden md:block">
                  <span className="text-slate-400">Solaris / </span> 
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradient}`}>Kiến Tạo Thế Giới</span>
              </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
              <Button onClick={() => saveWorldConfigToFile(config)} variant="secondary" fullWidth={false} className="!p-2 md:!px-4 md:!py-1.5 !text-xs rounded-full border-white/5 hover:border-white/20" title="Lưu Preset">
                  <Icon name="save" className="w-4 h-4 md:mr-2"/>
                  <span className="hidden md:inline">Preset</span>
              </Button>

               <Button onClick={() => setIsQuickAiModalOpen(true)} variant="secondary" fullWidth={false} className="!p-2 md:!px-4 md:!py-1.5 !text-xs rounded-full border-fuchsia-500/20 bg-fuchsia-500/5 hover:bg-fuchsia-500/20 text-fuchsia-300" title="AI Tạo Nhanh">
                  <Icon name="magic" className="w-4 h-4 md:mr-2"/>
                  <span className="hidden md:inline">AI Tạo Nhanh</span>
              </Button>

              <Button onClick={validateAndStart} variant="special" fullWidth={false} className="!py-2 !px-4 md:!px-6 rounded-full shadow-lg shadow-fuchsia-500/20 font-black tracking-widest text-xs md:text-sm">BẮT ĐẦU</Button>
          </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
          
          <div className={`absolute top-0 left-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-20 pointer-events-none transition-colors duration-1000 ${currentTheme.bg.replace('950/30', '500')}`}></div>

          <aside className="w-20 lg:w-72 glass-panel border-r border-white/5 flex flex-col py-6 gap-2 z-10 bg-slate-900/40 backdrop-blur-xl transition-all duration-300">
               {/* Sidebar Tabs */}
               <div className="flex-1 space-y-1 px-2">
                  {tabs.map(tab => {
                      const isActive = activeTab === tab.id;
                      const theme = TAB_THEMES[tab.id];
                      return (
                          <button 
                              key={tab.id} 
                              onClick={() => setActiveTab(tab.id)}
                              className={`
                                  group relative flex items-center gap-4 px-3 py-3 w-full rounded-xl transition-all duration-300 border
                                  ${isActive 
                                      ? `${theme.bg} ${theme.border}` 
                                      : 'border-transparent hover:bg-white/5'
                                  }
                              `}
                          >
                              {isActive && <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${theme.iconBg.split(' ')[0].replace('/20', '')}`}></div>}
                              <div className={`
                                  w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                                  ${isActive ? theme.iconBg : 'bg-slate-800/50 text-slate-500 group-hover:text-slate-300'}
                              `}>
                                  <Icon name={tab.icon} className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                              </div>
                              <div className="hidden lg:block text-left">
                                  <div className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{tab.label}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">{tab.desc}</div>
                              </div>
                          </button>
                      );
                  })}
              </div>
          </aside>

          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
              <div className="max-w-5xl mx-auto p-6 md:p-12 pb-32">
                  
                  {activeTab === 'general' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Cấu Hình Chung" subtitle="Thiết lập các quy tắc cơ bản và mức độ thử thách của trò chơi." theme={currentTheme} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                              <div>
                                  <SectionLabel icon="difficulty" label="Độ Khó" theme={currentTheme} />
                                  <GlassSelect theme={currentTheme} value={config.difficulty} onChange={e => handleSimpleChange('difficulty', e.target.value)}>
                                      {DIFFICULTY_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                                  </GlassSelect>
                              </div>
                              <div>
                                  <SectionLabel icon="warning" label="Chế Độ Người Lớn (18+)" theme={currentTheme} />
                                  <div className={`flex items-center justify-between bg-slate-900/40 border border-white/5 rounded-xl px-5 py-3 ${isSafetyFilterEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <span className="text-sm text-slate-300 font-medium">Cho phép nội dung người lớn</span>
                                      <input 
                                          type="checkbox" 
                                          checked={config.allowAdultContent} 
                                          disabled={isSafetyFilterEnabled} 
                                          onChange={e => handleSimpleChange('allowAdultContent', e.target.checked)} 
                                          className={`w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50 transition-all cursor-pointer`}
                                      />
                                  </div>
                              </div>
                          </div>
                          
                          {/* Advanced Rules Section */}
                           <Accordion title="Cấu Hình Nâng Cao" icon={<Icon name="sliders" className="w-4 h-4"/>} className="border-indigo-500/10 mb-8" startOpen={true}>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                   {[
                                       { key: 'enableTimeSystem', label: 'Hệ Thống Ngày Đêm & Thời Gian', desc: 'AI sẽ theo dõi giờ giấc, ngày tháng.' },
                                       { key: 'enableCurrencySystem', label: 'Hệ Thống Tiền Tệ & Giao Dịch', desc: 'Bật tính năng Gold, mua bán item.' },
                                       { key: 'enableInventorySystem', label: 'Hệ Thống Trang Bị & Túi Đồ', desc: 'Quản lý items chặt chẽ hơn.' },
                                       { key: 'enableCraftingSystem', label: 'Hệ Thống Chế Tạo (Crafting)', desc: 'Cho phép ghép nguyên liệu thành đồ mới.' },
                                       { key: 'enableReputationSystem', label: 'Hệ Thống Danh Tiếng (Reputation)', desc: 'NPC phản ứng dựa trên uy tín.' },
                                   ].map(item => (
                                       <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5">
                                           <div>
                                               <div className="text-sm font-bold text-slate-200">{item.label}</div>
                                               <div className="text-[10px] text-slate-500">{item.desc}</div>
                                           </div>
                                           <ToggleSwitch 
                                               enabled={(config.advancedRules as any)[item.key]} 
                                               setEnabled={(val) => handleAdvancedRuleChange(item.key as keyof AdvancedRules, val)} 
                                           />
                                       </div>
                                   ))}
                               </div>
                           </Accordion>

                          {/* Only show 18+ options if enabled */}
                          {config.allowAdultContent && (
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                                <div>
                                    <SectionLabel icon="sliders" label="Mức Độ Bạo Lực" theme={currentTheme} />
                                    <GlassSelect theme={currentTheme} value={config.violenceLevel || 'Thực tế'} onChange={e => handleSimpleChange('violenceLevel', e.target.value)}>
                                        {VIOLENCE_LEVEL_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                                    </GlassSelect>
                                </div>
                                <div>
                                    <SectionLabel icon="sliders" label="Phong Cách 18+ (Nếu có)" theme={currentTheme} />
                                    <GlassSelect theme={currentTheme} value={config.sexualContentStyle || 'Gợi cảm'} onChange={e => handleSimpleChange('sexualContentStyle', e.target.value)}>
                                        {SEXUAL_CONTENT_STYLE_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                                    </GlassSelect>
                                </div>
                                <div>
                                    <SectionLabel icon="sliders" label="Tông Truyện" theme={currentTheme} />
                                    <GlassSelect theme={currentTheme} value={config.storyTone || 'Trung tính'} onChange={e => handleSimpleChange('storyTone', e.target.value)}>
                                        {STORY_TONE_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                                    </GlassSelect>
                                </div>
                            </div>
                          )}
                      </GlassSection>
                  )}

                  {activeTab === 'world' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Xây Dựng Thế Giới" subtitle="Định hình lịch sử, địa lý và hệ thống phép thuật." theme={currentTheme} />
                          <div className="flex gap-4 items-end mb-8">
                              <div className="flex-1">
                                <SectionLabel icon="world" label="Thể Loại Chính" theme={currentTheme} />
                                <GlassInput theme={currentTheme} value={config.storyContext.genre} onChange={e => handleNestedChange('storyContext', 'genre', e.target.value)} placeholder="VD: Tiên hiệp, Cyberpunk..." className="font-bold !text-base" />
                              </div>
                              <AiAssistButton isLoading={loadingStates['genre']} onClick={() => runAiAssist('genre', () => aiService.generateGenre(config), res => handleNestedChange('storyContext', 'genre', res))} className="!h-[46px] !px-4 !rounded-xl !bg-emerald-600 hover:!bg-emerald-500">Gợi ý</AiAssistButton>
                          </div>
                          
                          <div className="flex gap-4 items-end mb-8">
                              <div className="flex-1">
                                <SectionLabel icon="world" label="Bối Cảnh (Setting)" theme={currentTheme} />
                                <GlassInput theme={currentTheme} value={config.storyContext.setting} onChange={e => handleNestedChange('storyContext', 'setting', e.target.value)} placeholder="Mô tả ngắn về thế giới..." />
                              </div>
                               <AiAssistButton isLoading={loadingStates['setting']} onClick={() => runAiAssist('setting', () => aiService.generateSetting(config), res => handleNestedChange('storyContext', 'setting', res))} className="!h-[46px] !px-4 !rounded-xl">Gợi ý</AiAssistButton>
                          </div>

                          <div className="space-y-4 mb-8">
                              <Accordion title="Lịch Sử & Truyền Thuyết" icon={<Icon name="memory" className="w-4 h-4"/>} className="border-emerald-500/10">
                                   <textarea value={config.worldLore.history} onChange={e => handleLoreChange('history', e.target.value)} className="w-full bg-transparent border-none text-slate-300 min-h-[100px] text-sm focus:ring-0 placeholder:text-slate-600" placeholder="Các sự kiện lớn trong quá khứ..."/>
                              </Accordion>
                              <Accordion title="Địa Lý & Vùng Đất" icon={<Icon name="world" className="w-4 h-4"/>} className="border-emerald-500/10">
                                   <textarea value={config.worldLore.geography} onChange={e => handleLoreChange('geography', e.target.value)} className="w-full bg-transparent border-none text-slate-300 min-h-[100px] text-sm focus:ring-0 placeholder:text-slate-600" placeholder="Mô tả các lục địa, thành phố..."/>
                              </Accordion>
                              <Accordion title="Hệ Thống Phép Thuật / Công Nghệ" icon={<Icon name="magic" className="w-4 h-4"/>} className="border-emerald-500/10">
                                   <textarea value={config.worldLore.magicSystem} onChange={e => handleLoreChange('magicSystem', e.target.value)} className="w-full bg-transparent border-none text-slate-300 min-h-[100px] text-sm focus:ring-0 placeholder:text-slate-600" placeholder="Quy tắc vận hành của phép thuật..."/>
                              </Accordion>
                          </div>
                      </GlassSection>
                  )}

                  {activeTab === 'character' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Nhân Vật Chính" subtitle="Tạo dựng người hùng cho câu chuyện của bạn." theme={currentTheme} />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                  <SectionLabel icon="user" label="Tên Nhân Vật" theme={currentTheme} />
                                  <GlassInput theme={currentTheme} value={config.character.name} onChange={e => handleNestedChange('character', 'name', e.target.value)} placeholder="Nhập tên..." className="font-bold !text-base" />
                              </div>
                              <div>
                                  <SectionLabel icon="info" label="Giới Tính" theme={currentTheme} />
                                  <GlassSelect theme={currentTheme} value={config.character.gender} onChange={e => handleNestedChange('character', 'gender', e.target.value)}>
                                      {GENDER_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}
                                  </GlassSelect>
                              </div>
                          </div>
                          
                           <div className="mb-6">
                              <SectionLabel icon="user" label="Tính Cách" theme={currentTheme} />
                              <GlassSelect theme={currentTheme} value={config.character.personality} onChange={e => handleNestedChange('character', 'personality', e.target.value)}>
                                  {PERSONALITY_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}
                              </GlassSelect>
                              {config.character.personality === 'Tuỳ chỉnh' && (
                                  <GlassInput theme={currentTheme} value={config.character.customPersonality} onChange={e => handleNestedChange('character', 'customPersonality', e.target.value)} placeholder="Mô tả tính cách..." className="mt-2" />
                              )}
                          </div>
                          
                          <div className="mb-6">
                               <div className="flex justify-between items-center mb-2">
                                  <SectionLabel icon="book" label="Tiểu Sử" theme={currentTheme} />
                                  <AiAssistButton isLoading={loadingStates['bio']} onClick={() => runAiAssist('bio', () => aiService.generateCharacterBio(config), res => handleNestedChange('character', 'bio', res))}>Gợi ý</AiAssistButton>
                                </div>
                               <textarea value={config.character.bio} onChange={e => handleNestedChange('character', 'bio', e.target.value)} className="w-full bg-slate-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:bg-slate-900/80 focus:ring-2 focus:ring-fuchsia-500/20 shadow-inner h-24" placeholder="Quá khứ và xuất thân..." />
                          </div>
                          
                          <div className="mb-6">
                               <div className="flex justify-between items-center mb-2">
                                  <SectionLabel icon="goal" label="Động Lực" theme={currentTheme} />
                                  <AiAssistButton isLoading={loadingStates['motivation']} onClick={() => runAiAssist('motivation', () => aiService.generateCharacterMotivation(config), res => handleNestedChange('character', 'motivation', res))}>Gợi ý</AiAssistButton>
                               </div>
                               <GlassInput theme={currentTheme} value={config.character.motivation} onChange={e => handleNestedChange('character', 'motivation', e.target.value)} placeholder="Mục tiêu chính..." />
                          </div>

                          {/* RPG STAT TRACKER */}
                          <div className="bg-slate-900/30 rounded-2xl p-5 border border-fuchsia-500/20 mb-8 relative overflow-hidden">
                              <div className="flex justify-between items-center mb-4">
                                  <SectionLabel icon="sliders" label="Chỉ Số Tùy Chỉnh (Dùng để Thăng Cấp)" theme={currentTheme} />
                                  <div className="flex gap-2">
                                     <AiAssistButton isLoading={loadingStates['stats']} onClick={generateStatsByGenre} className="!text-[10px] !py-1.5 !px-3 !bg-fuchsia-700 hover:!bg-fuchsia-600">AI Gợi ý</AiAssistButton>
                                     <Button onClick={addCustomStat} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-[10px] rounded-lg">Thêm</Button>
                                  </div>
                              </div>
                              {config.character.customStats.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-3">
                                      {config.character.customStats.map((stat, idx) => (
                                          <div key={stat.id} className="flex flex-col gap-2 p-3 bg-slate-950/50 rounded-xl border border-white/5 relative group">
                                               <div className="flex gap-2 items-center">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <Icon name="magic" className="w-4 h-4 text-fuchsia-400"/>
                                                    </div>
                                                    <input 
                                                        value={stat.name} 
                                                        onChange={(e) => updateCustomStat(idx, 'name', e.target.value)}
                                                        className="w-1/3 bg-transparent border-b border-white/10 text-sm font-bold text-white px-1 py-1 focus:outline-none focus:border-fuchsia-500" 
                                                        placeholder="Tên chỉ số" 
                                                    />
                                                    <input 
                                                        value={stat.description || ''} 
                                                        onChange={(e) => updateCustomStat(idx, 'description', e.target.value)}
                                                        className="flex-1 bg-transparent border-b border-white/10 text-xs text-slate-300 px-1 py-1 focus:outline-none focus:border-fuchsia-500 italic" 
                                                        placeholder="Mô tả (Dùng để làm gì?)" 
                                                    />
                                                    <button onClick={() => removeCustomStat(idx)} className="text-slate-600 hover:text-red-400 p-1"><Icon name="trash" className="w-4 h-4"/></button>
                                               </div>
                                               <div className="flex gap-2 items-center text-xs">
                                                   <span className="text-slate-500 w-12">Giá trị:</span>
                                                   <input type="number" value={stat.value} onChange={(e) => updateCustomStat(idx, 'value', parseInt(e.target.value))} className="w-16 bg-slate-900 border border-white/10 rounded px-1 py-0.5 text-center text-slate-200" />
                                                   <span className="text-slate-500">/</span>
                                                   <input type="number" value={stat.max} onChange={(e) => updateCustomStat(idx, 'max', parseInt(e.target.value))} className="w-16 bg-slate-900 border border-white/10 rounded px-1 py-0.5 text-center text-slate-200" />
                                               </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="text-center text-xs text-slate-600 italic py-4 border border-dashed border-white/5 rounded-xl">Chưa có chỉ số nào (VD: Sanity, Mana, Stamina...)</div>
                              )}
                          </div>
                      </GlassSection>
                  )}
                  
                  {activeTab === 'progression' && (
                       <GlassSection theme={currentTheme}>
                            <Header title="Hệ Thống Cấp Bậc" subtitle="Xác định con đường thăng tiến sức mạnh của nhân vật." theme={currentTheme} />
                            
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1">
                                    <SectionLabel icon="flag" label="Tên Hệ Thống" theme={currentTheme} />
                                    <GlassInput theme={currentTheme} value={config.progressionSystem.name} onChange={e => setConfig(p => ({...p, progressionSystem: {...p.progressionSystem, name: e.target.value}}))} placeholder="VD: Hệ Thống Tu Tiên, Class Rank..." />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={() => applyProgressionTemplate('CULTIVATION')} variant="secondary" fullWidth={false} className="!py-3 !px-4 !text-xs !bg-rose-500/10 hover:!bg-rose-500/20 text-rose-300">Tu Tiên</Button>
                                    <Button onClick={() => applyProgressionTemplate('HUNTER')} variant="secondary" fullWidth={false} className="!py-3 !px-4 !text-xs !bg-blue-500/10 hover:!bg-blue-500/20 text-blue-300">Hunter</Button>
                                    <Button onClick={() => applyProgressionTemplate('CYBERPUNK')} variant="secondary" fullWidth={false} className="!py-3 !px-4 !text-xs !bg-yellow-500/10 hover:!bg-yellow-500/20 text-yellow-300">Cyberpunk</Button>
                                    <AiAssistButton isLoading={loadingStates['progression']} onClick={generateProgression} className="!h-[46px] !px-4 !rounded-xl">AI Tạo</AiAssistButton>
                                </div>
                            </div>

                            <div className="space-y-4 relative">
                                {config.progressionSystem.ranks.length > 0 && (
                                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-rose-500/50 to-transparent z-0"></div>
                                )}
                                
                                {config.progressionSystem.ranks.map((rank, idx) => (
                                    <div key={rank.id} className="relative z-10 pl-14">
                                        <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-slate-900 border-2 border-rose-500 flex items-center justify-center text-[8px] font-bold text-rose-500 shadow-lg shadow-rose-500/20">
                                            {idx + 1}
                                        </div>
                                        
                                        <div className="glass-panel p-4 rounded-xl border-white/5 bg-slate-900/40">
                                            <div className="flex gap-3 mb-3">
                                                <input 
                                                    value={rank.name} 
                                                    onChange={e => updateRank(idx, 'name', e.target.value)} 
                                                    className="w-1/3 bg-transparent border-b border-white/10 text-base font-bold text-white px-2 py-1 focus:outline-none focus:border-rose-500 placeholder:text-slate-600" 
                                                    placeholder="Tên Cảnh Giới"
                                                />
                                                <input 
                                                    value={rank.description} 
                                                    onChange={e => updateRank(idx, 'description', e.target.value)} 
                                                    className="flex-1 bg-transparent border-b border-white/10 text-sm text-slate-300 px-2 py-1 focus:outline-none focus:border-rose-500 placeholder:text-slate-600 italic" 
                                                    placeholder="Mô tả sức mạnh..."
                                                />
                                                <button onClick={() => removeRank(idx)} className="p-2 text-slate-600 hover:text-red-400"><Icon name="trash" className="w-4 h-4"/></button>
                                            </div>
                                            
                                            {/* Requirements */}
                                            <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điều kiện thăng cấp (Requirements)</span>
                                                    <button onClick={() => addRequirement(idx)} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-rose-300">+ Thêm ĐK</button>
                                                </div>
                                                {rank.requirements.length === 0 ? (
                                                    <div className="text-[10px] text-slate-600 italic">Không có yêu cầu (Tự động đạt được hoặc mặc định)</div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {rank.requirements.map((req, rIdx) => (
                                                            <div key={rIdx} className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-400">Cần</span>
                                                                <select 
                                                                    value={req.statId} 
                                                                    onChange={e => updateRequirement(idx, rIdx, 'statId', e.target.value)}
                                                                    className="bg-slate-900 border border-white/10 text-xs text-white rounded px-2 py-1 outline-none focus:border-rose-500 max-w-[120px]"
                                                                >
                                                                    {config.character.customStats.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                                    ))}
                                                                </select>
                                                                <span className="text-xs text-slate-400">>=</span>
                                                                <input 
                                                                    type="number" 
                                                                    value={req.value} 
                                                                    onChange={e => updateRequirement(idx, rIdx, 'value', parseInt(e.target.value))}
                                                                    className="w-16 bg-slate-900 border border-white/10 text-xs text-white rounded px-2 py-1 outline-none focus:border-rose-500"
                                                                />
                                                                <button onClick={() => removeRequirement(idx, rIdx)} className="text-slate-600 hover:text-red-400"><Icon name="xCircle" className="w-3 h-3"/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="pl-14 pt-2">
                                    <Button onClick={addRank} variant="secondary" fullWidth className="!border-dashed !border-rose-500/30 !text-rose-300 hover:!bg-rose-500/10">
                                        <Icon name="plus" className="w-4 h-4 mr-2"/> Thêm Cấp Bậc Tiếp Theo
                                    </Button>
                                </div>
                            </div>
                       </GlassSection>
                  )}

                  {activeTab === 'assets' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Tài Sản & NPC" subtitle="Hành trang khởi đầu và các thực thể trong thế giới." theme={currentTheme} />
                           
                           {/* Knowledge Base Import */}
                           <div className="mb-8 p-4 rounded-xl bg-slate-900/40 border border-amber-500/10">
                               <div className="flex justify-between items-center mb-4">
                                   <SectionLabel icon="cpu" label="Knowledge Base (RAG)" theme={currentTheme} />
                                   <Button onClick={() => knowledgeInputRef.current?.click()} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-[10px] rounded-lg border-amber-500/20 text-amber-300">Nạp Knowledge (.json)</Button>
                                   <input type="file" ref={knowledgeInputRef} onChange={handleKnowledgeImport} className="hidden" accept=".json" />
                               </div>
                               <div className="text-xs text-slate-400">
                                   {config.initialCodex && config.initialCodex.length > 0 ? (
                                       <span className="text-emerald-400">Đã nạp {config.initialCodex.length} mảnh dữ liệu RAG.</span>
                                   ) : (
                                       <span className="italic">Chưa có dữ liệu. Nạp file từ màn hình "Train RAG" để AI thông minh hơn.</span>
                                   )}
                               </div>
                           </div>

                           <div className="mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <SectionLabel icon="quest" label="Hành Trang (Inventory)" theme={currentTheme} />
                                    <Button onClick={() => setConfig(p => ({...p, character: {...p.character, inventory: [...p.character.inventory, '']}}))} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-[10px] rounded-lg">Thêm Item</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {config.character.inventory.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 group">
                                            <GlassInput theme={currentTheme} value={item} onChange={e => {const n=[...config.character.inventory]; n[idx]=e.target.value; setConfig(p=>({...p, character: {...p.character, inventory: n}}))}} className="!py-2 !text-emerald-100" placeholder="Tên vật phẩm"/>
                                            <button onClick={() => setConfig(p => ({...p, character: {...p.character, inventory: p.character.inventory.filter((_,i)=>i!==idx)}}))} className="text-slate-600 hover:text-red-400 p-2 opacity-50 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                          </div>

                          <div className="mb-8">
                              <div className="flex justify-between items-center mb-4">
                                  <SectionLabel icon="entity" label="Thực Thể Khởi Đầu (Entities)" theme={currentTheme} />
                                  <Button onClick={() => setConfig(p => ({...p, initialEntities: [...p.initialEntities, { name: '', type: 'NPC', personality: '', description: '' }]}))} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-[10px] rounded-lg">Thêm Entity</Button>
                              </div>
                              <div className="space-y-4">
                                  {config.initialEntities.map((entity, idx) => (
                                      <div key={idx} className="glass-panel p-4 rounded-xl border-amber-500/10 bg-slate-900/30">
                                          <div className="grid grid-cols-2 gap-4 mb-3">
                                              <GlassInput theme={currentTheme} value={entity.name} onChange={e => {const n=[...config.initialEntities]; n[idx].name=e.target.value; setConfig(p=>({...p, initialEntities: n}))}} placeholder="Tên thực thể"/>
                                              <GlassSelect theme={currentTheme} value={entity.type} onChange={e => {const n=[...config.initialEntities]; n[idx].type=e.target.value; setConfig(p=>({...p, initialEntities: n}))}}>
                                                  {ENTITY_TYPE_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}
                                              </GlassSelect>
                                          </div>
                                          <div className="flex gap-2">
                                              <GlassInput theme={currentTheme} value={entity.description} onChange={e => {const n=[...config.initialEntities]; n[idx].description=e.target.value; setConfig(p=>({...p, initialEntities: n}))}} placeholder="Mô tả ngắn..."/>
                                               <div className="flex flex-col gap-1">
                                                    <AiAssistButton isLoading={loadingStates[`ent_${idx}`]} onClick={() => runAiAssist(`ent_${idx}`, () => aiService.generateEntityDescription(config, entity), res => {const n=[...config.initialEntities]; n[idx].description=res; setConfig(p=>({...p, initialEntities: n}))})} className="!p-2"/>
                                                    <button onClick={() => setConfig(p => ({...p, initialEntities: p.initialEntities.filter((_,i)=>i!==idx)}))} className="p-2 text-slate-600 hover:text-red-400 border border-white/5 rounded-md hover:bg-white/5"><Icon name="trash" className="w-4 h-4"/></button>
                                               </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </GlassSection>
                  )}
                  {activeTab === 'narrative' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Kịch Bản & Lời Dẫn" subtitle="Thiết lập phong cách kể chuyện và điểm khởi đầu." theme={currentTheme} />
                          <div className="mb-8">
                              <SectionLabel icon="play" label="Kịch Bản Khởi Đầu" theme={currentTheme} />
                              <GlassSelect theme={currentTheme} value={config.startingScenario} onChange={e => handleSimpleChange('startingScenario', e.target.value)}>
                                  {STARTING_SCENARIO_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                              </GlassSelect>
                          </div>
                          
                          <div className="mb-8">
                               <SectionLabel icon="search" label="Góc Nhìn Kể Chuyện" theme={currentTheme} />
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                   {PERSPECTIVE_OPTIONS.map(opt => (
                                       <button 
                                          key={opt.value}
                                          onClick={() => setConfig(p => ({...p, writingConfig: {...p.writingConfig, perspective: opt.value as any}}))}
                                          className={`p-3 rounded-xl border text-left transition-all ${config.writingConfig.perspective === opt.value ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200' : 'bg-slate-900/30 border-white/5 text-slate-500 hover:bg-white/5'}`}
                                       >
                                           <div className="text-sm font-bold mb-1">{opt.value === 'second' ? 'Ngôi thứ 2' : opt.value === 'first' ? 'Ngôi thứ 1' : 'Ngôi thứ 3'}</div>
                                           <div className="text-[10px] opacity-70">{opt.label}</div>
                                       </button>
                                   ))}
                               </div>
                          </div>

                          <div className="mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <SectionLabel icon="terminal" label="Độ Dài Phản Hồi Tối Thiểu (Words)" theme={currentTheme} />
                                    <span className="text-cyan-400 font-mono font-bold text-sm bg-slate-900 px-2 py-1 rounded">{config.writingConfig.minResponseLength || 1500} từ</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="500" 
                                    max="5000" 
                                    step="100"
                                    value={config.writingConfig.minResponseLength || 1500}
                                    onChange={(e) => setConfig(p => ({...p, writingConfig: {...p.writingConfig, minResponseLength: Number(e.target.value)}}))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <p className="text-[10px] text-slate-500 mt-2">Ép AI viết dài hơn. Lưu ý: Độ dài quá lớn có thể khiến AI phản hồi chậm hoặc bị cắt ngang.</p>
                          </div>
                      </GlassSection>
                  )}
              </div>
          </main>
      </div>
    </div>
  );
};

export default WorldCreationScreen;
