
import React, { useState, useCallback, useEffect } from 'react';
import { WorldConfig, InitialEntity } from '../types';
import { 
    DEFAULT_WORLD_CONFIG, 
    GENDER_OPTIONS, 
    PERSONALITY_OPTIONS, 
    DIFFICULTY_OPTIONS,
    SEXUAL_CONTENT_STYLE_OPTIONS,
    VIOLENCE_LEVEL_OPTIONS,
    STORY_TONE_OPTIONS,
    ENTITY_TYPE_OPTIONS,
    PERSPECTIVE_OPTIONS,
    STARTING_SCENARIO_OPTIONS
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

// --- Theme Configurations ---

type ThemeColor = 'indigo' | 'emerald' | 'fuchsia' | 'amber' | 'cyan';

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

// --- Styled Components ---

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

const GlassTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { theme: ThemeStyles }> = ({ theme, className = '', ...props }) => (
    <textarea
      className={`w-full bg-slate-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-300 focus:outline-none focus:bg-slate-900/80 focus:ring-2 shadow-inner resize-none ${theme.ring} ${className}`}
      {...props}
    />
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
        <Icon name="icon" className="w-3.5 h-3.5" />
        {label}
    </div>
);

const Header: React.FC<{ title: string, subtitle: string, theme: ThemeStyles }> = ({ title, subtitle, theme }) => (
    <div className="mb-8">
        <h2 className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient}`}>{title}</h2>
        <p className={`text-sm mt-1 font-medium ${theme.text} opacity-80`}>{subtitle}</p>
    </div>
);


// --- Main Screen ---

interface WorldCreationScreenProps {
  onBack: () => void;
  onStartGame: (config: WorldConfig) => void;
  initialConfig?: WorldConfig | null;
}

type Tab = 'general' | 'world' | 'character' | 'assets' | 'narrative';
type LoadingStates = { [key: string]: boolean };

const WorldCreationScreen: React.FC<WorldCreationScreenProps> = ({ onBack, onStartGame, initialConfig }) => {
  const [config, setConfig] = useState<WorldConfig>(DEFAULT_WORLD_CONFIG);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [storyIdea, setStoryIdea] = useState('');
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [retryAiTask, setRetryAiTask] = useState<(() => void) | null>(null);
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ title: '', messages: [''] });

  // Header Modal States
  const [isQuickAiModalOpen, setIsQuickAiModalOpen] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  
  const isSafetyFilterEnabled = getSettings().safetySettings.enabled;
  const currentTheme = TAB_THEMES[activeTab];

  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({
          ...DEFAULT_WORLD_CONFIG, 
          ...initialConfig,
          worldLore: { ...DEFAULT_WORLD_CONFIG.worldLore, ...(initialConfig.worldLore || {}) },
          character: { 
              ...DEFAULT_WORLD_CONFIG.character, 
              ...initialConfig.character,
              inventory: initialConfig.character?.inventory || [],
              relationships: initialConfig.character?.relationships || []
          },
          writingConfig: { ...DEFAULT_WORLD_CONFIG.writingConfig, ...(initialConfig.writingConfig || {}) }
      }));
    } else {
      setConfig(DEFAULT_WORLD_CONFIG);
    }
  }, [initialConfig]);

  const handleSimpleChange = useCallback(<T extends keyof WorldConfig>(key: T, value: WorldConfig[T]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleNestedChange = useCallback(<T extends keyof WorldConfig, U extends keyof WorldConfig[T]>(parentKey: T, childKey: U, value: WorldConfig[T][U]) => {
    setConfig(prev => ({ ...prev, [parentKey]: { ...(prev[parentKey] as object), [childKey]: value } }));
  }, []);
  
  const handleLoreChange = useCallback(<T extends keyof WorldConfig['worldLore']>(key: T, value: WorldConfig['worldLore'][T]) => {
      setConfig(prev => ({ ...prev, worldLore: { ...prev.worldLore, [key]: value } }));
  }, []);

  const handleWritingChange = useCallback(<T extends keyof WorldConfig['writingConfig']>(key: T, value: WorldConfig['writingConfig'][T]) => {
      setConfig(prev => ({ ...prev, writingConfig: { ...prev.writingConfig, [key]: value } }));
  }, []);

  const handleEntityChange = useCallback((index: number, field: keyof InitialEntity, value: string) => {
    const newEntities = [...config.initialEntities];
    newEntities[index] = { ...newEntities[index], [field]: value };
    handleSimpleChange('initialEntities', newEntities);
  }, [config.initialEntities, handleSimpleChange]);

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
                relationships: newConfig.character?.relationships || []
            },
            initialEntities: newConfig.initialEntities || []
        }));
        setNotificationContent({ title: 'Hoàn tất', messages: ["AI đã kiến tạo thế giới. Hãy kiểm tra lại các tab."] });
        setIsNotificationOpen(true);
        setActiveTab('world'); 
        setIsQuickAiModalOpen(false); // Close modal if open
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
     onStartGame(config);
  };

  const tabs: {id: Tab, label: string, icon: any, desc: string}[] = [
      { id: 'general', label: 'Cấu Hình', icon: 'settings', desc: 'Luật lệ & An toàn' },
      { id: 'world', label: 'Thế Giới', icon: 'world', desc: 'Bối cảnh & Lịch sử' },
      { id: 'character', label: 'Nhân Vật', icon: 'user', desc: 'Tiểu sử & Kỹ năng' },
      { id: 'assets', label: 'Tài Sản', icon: 'quest', desc: 'Kho đồ & NPC' },
      { id: 'narrative', label: 'Kịch Bản', icon: 'news', desc: 'Lời dẫn & Khởi đầu' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      <ApiKeyModal isOpen={isApiKeyModalOpen} onSave={(key) => {
          const s = getSettings();
          saveSettings({ ...s, apiKeyConfig: { keys: [...s.apiKeyConfig.keys.filter(Boolean), key] } });
          setIsApiKeyModalOpen(false);
          if (retryAiTask) { retryAiTask(); setRetryAiTask(null); }
      }} onCancel={() => setIsApiKeyModalOpen(false)} />
      
      <NotificationModal isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} title={notificationContent.title} messages={notificationContent.messages} />

      <NotificationModal 
        isOpen={isKnowledgeModalOpen} 
        onClose={() => setIsKnowledgeModalOpen(false)} 
        title="Tính năng sắp ra mắt" 
        messages={["Tính năng 'Nhập Knowledge' cho phép bạn tải lên tài liệu riêng để AI học hỏi.", "Tính năng này sẽ sớm có mặt trong các bản cập nhật tiếp theo!"]} 
      />

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
      <header className="h-16 flex-shrink-0 glass-panel border-b border-white/5 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20 relative">
          <div className="flex items-center gap-2 md:gap-4">
              <Button onClick={onBack} variant="ghost" fullWidth={false} className="!p-2 hover:bg-white/10 rounded-full"><Icon name="back" className="w-5 h-5"/></Button>
              <h1 className="text-lg font-bold tracking-tight hidden md:block">
                  <span className="text-slate-400">Solaris / </span> 
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradient}`}>Kiến Tạo Thế Giới</span>
              </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
              {/* Knowledge Button */}
              <Button onClick={() => setIsKnowledgeModalOpen(true)} variant="secondary" fullWidth={false} className="!p-2 md:!px-4 md:!py-1.5 !text-xs rounded-full border-white/5 hover:border-white/20" title="Nhập Knowledge (Sắp có)">
                  <Icon name="upload" className="w-4 h-4 md:mr-2"/>
                  <span className="hidden md:inline">Knowledge</span>
              </Button>

              {/* Save Preset Button */}
              <Button onClick={() => saveWorldConfigToFile(config)} variant="secondary" fullWidth={false} className="!p-2 md:!px-4 md:!py-1.5 !text-xs rounded-full border-white/5 hover:border-white/20" title="Lưu Preset">
                  <Icon name="save" className="w-4 h-4 md:mr-2"/>
                  <span className="hidden md:inline">Preset</span>
              </Button>

               {/* Quick AI Button */}
               <Button onClick={() => setIsQuickAiModalOpen(true)} variant="secondary" fullWidth={false} className="!p-2 md:!px-4 md:!py-1.5 !text-xs rounded-full border-fuchsia-500/20 bg-fuchsia-500/5 hover:bg-fuchsia-500/20 text-fuchsia-300" title="AI Tạo Nhanh">
                  <Icon name="magic" className="w-4 h-4 md:mr-2"/>
                  <span className="hidden md:inline">AI Tạo Nhanh</span>
              </Button>

              {/* START Button */}
              <Button onClick={validateAndStart} variant="special" fullWidth={false} className="!py-2 !px-4 md:!px-6 rounded-full shadow-lg shadow-fuchsia-500/20 font-black tracking-widest text-xs md:text-sm">BẮT ĐẦU</Button>
          </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Background Glow based on Active Tab */}
          <div className={`absolute top-0 left-0 w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-20 pointer-events-none transition-colors duration-1000 ${currentTheme.bg.replace('950/30', '500')}`}></div>

          {/* Sidebar Navigation */}
          <aside className="w-20 lg:w-72 glass-panel border-r border-white/5 flex flex-col py-6 gap-2 z-10 bg-slate-900/40 backdrop-blur-xl transition-all duration-300">
              <div className="px-4 mb-4 hidden lg:block">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Quy trình</div>
              </div>
              
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
                              {/* Active Indicator Bar */}
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
              
              <div className="px-4 pt-4 border-t border-white/5 hidden lg:block">
                  <div className={`rounded-2xl p-4 border transition-all duration-500 ${currentTheme.bg} ${currentTheme.border}`}>
                      <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${currentTheme.label}`}>
                          <Icon name="magic" className="w-3.5 h-3.5" />
                          AI Khởi Tạo Nhanh
                      </div>
                      <textarea 
                          value={storyIdea} 
                          onChange={(e) => setStoryIdea(e.target.value)} 
                          placeholder="Nhập ý tưởng (VD: Kiếm hiệp Kim Dung, Cyberpunk 2077...)" 
                          className="w-full bg-slate-950/50 border border-white/5 rounded-lg text-xs p-3 mb-3 resize-none text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20" 
                          rows={3}
                      />
                      <AiAssistButton isLoading={loadingStates['worldIdea']} onClick={handleGenerateWorldFromIdea} isFullWidth className="!text-xs !rounded-lg !py-2">Tạo Ngay</AiAssistButton>
                  </div>
              </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
              <div className="max-w-5xl mx-auto p-6 md:p-12 pb-32">
                  
                  {/* TAB 1: GENERAL */}
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
                                  {isSafetyFilterEnabled && <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1"><Icon name="xCircle" className="w-3 h-3"/> Cần tắt bộ lọc an toàn trong Cài đặt trước.</p>}
                              </div>
                          </div>

                          {config.allowAdultContent && !isSafetyFilterEnabled && (
                             <div className="mb-8 p-6 rounded-2xl bg-pink-500/5 border border-pink-500/10">
                                  <div className="flex items-center gap-2 mb-4 text-pink-400 text-xs font-bold uppercase tracking-wider">
                                      <Icon name="warning" className="w-4 h-4" /> Cấu hình Nội dung Nhạy cảm
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div><label className="text-xs text-slate-400 mb-1 block">Phong Cách</label><GlassSelect theme={currentTheme} value={config.sexualContentStyle} onChange={e => handleSimpleChange('sexualContentStyle', e.target.value)} className="!py-2 !text-xs">{SEXUAL_CONTENT_STYLE_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}</GlassSelect></div>
                                      <div><label className="text-xs text-slate-400 mb-1 block">Bạo Lực</label><GlassSelect theme={currentTheme} value={config.violenceLevel} onChange={e => handleSimpleChange('violenceLevel', e.target.value)} className="!py-2 !text-xs">{VIOLENCE_LEVEL_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}</GlassSelect></div>
                                      <div><label className="text-xs text-slate-400 mb-1 block">Tông Màu</label><GlassSelect theme={currentTheme} value={config.storyTone} onChange={e => handleSimpleChange('storyTone', e.target.value)} className="!py-2 !text-xs">{STORY_TONE_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}</GlassSelect></div>
                                  </div>
                             </div>
                          )}

                          <div className="border-t border-white/5 pt-6">
                              <SectionLabel icon="rules" label="Luật Lệ Cốt Lõi (Tuyệt đối)" theme={currentTheme} />
                              <div className="space-y-3">
                                  {config.coreRules.map((rule, idx) => (
                                      <div key={idx} className="flex gap-2 group">
                                          <GlassInput theme={currentTheme} value={rule} onChange={e => {const n = [...config.coreRules]; n[idx] = e.target.value; handleSimpleChange('coreRules', n);}} placeholder="Nhập luật lệ..." className="!py-2"/>
                                          <button onClick={() => handleSimpleChange('coreRules', config.coreRules.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400 p-2 opacity-50 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-5 h-5"/></button>
                                      </div>
                                  ))}
                                  <Button onClick={() => handleSimpleChange('coreRules', [...config.coreRules, ''])} variant="secondary" className="!text-xs border-dashed !py-2.5 opacity-70 hover:opacity-100 mt-2"><Icon name="plus" className="w-3 h-3 mr-2"/> Thêm Luật Mới</Button>
                              </div>
                          </div>
                      </GlassSection>
                  )}

                  {/* TAB 2: WORLD LORE */}
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

                          <div className="mb-8">
                              <div className="flex justify-between mb-2">
                                  <SectionLabel icon="info" label="Bối Cảnh Chung" theme={currentTheme} />
                                  <AiAssistButton isLoading={loadingStates['setting']} onClick={() => runAiAssist('setting', () => aiService.generateSetting(config), res => handleNestedChange('storyContext', 'setting', res))} className="!text-[10px] !py-1 !px-3 !bg-emerald-600/50 hover:!bg-emerald-500/50 border border-emerald-500/30">Viết chi tiết</AiAssistButton>
                              </div>
                              <GlassTextArea theme={currentTheme} value={config.storyContext.setting} onChange={e => handleNestedChange('storyContext', 'setting', e.target.value)} className="min-h-[140px]" placeholder="Mô tả tổng quan về thế giới..." />
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

                          <div className="bg-slate-900/20 rounded-2xl p-5 border border-white/5">
                              <div className="flex justify-between items-center mb-4">
                                  <SectionLabel icon="companions" label="Các Phe Phái (Factions)" theme={currentTheme} />
                                  <Button onClick={() => handleLoreChange('factions', [...config.worldLore.factions, { name: '', description: '' }])} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-[10px] rounded-lg">Thêm Phe</Button>
                              </div>
                              {config.worldLore.factions.map((faction, idx) => (
                                  <div key={idx} className="mb-3 p-4 bg-slate-950/40 rounded-xl border border-white/5 relative group hover:border-emerald-500/30 transition-colors">
                                      <input value={faction.name} onChange={e => {const n=[...config.worldLore.factions]; n[idx].name=e.target.value; handleLoreChange('factions', n);}} className="w-full bg-transparent border-none text-sm font-bold text-emerald-300 placeholder:text-emerald-500/30 focus:ring-0 p-0 mb-1" placeholder="Tên phe phái"/>
                                      <textarea value={faction.description} onChange={e => {const n=[...config.worldLore.factions]; n[idx].description=e.target.value; handleLoreChange('factions', n);}} className="w-full bg-transparent border-none text-xs text-slate-400 focus:ring-0 p-0 resize-none placeholder:text-slate-600" placeholder="Mô tả mục tiêu và sức mạnh..." rows={2}/>
                                      <button onClick={() => handleLoreChange('factions', config.worldLore.factions.filter((_,i)=>i!==idx))} className="absolute top-3 right-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-4 h-4"/></button>
                                  </div>
                              ))}
                              {config.worldLore.factions.length === 0 && <p className="text-center text-xs text-slate-600 italic py-4">Chưa có phe phái nào.</p>}
                          </div>
                      </GlassSection>
                  )}

                  {/* TAB 3: CHARACTER */}
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
                              <SectionLabel icon="status" label="Tính Cách" theme={currentTheme} />
                              <GlassSelect theme={currentTheme} value={config.character.personality} onChange={e => handleNestedChange('character', 'personality', e.target.value)} className="mb-3">
                                  {PERSONALITY_OPTIONS.map(o=><option key={o} value={o} className="bg-slate-900">{o}</option>)}
                              </GlassSelect>
                              {config.character.personality === 'Tuỳ chỉnh' && (
                                  <GlassTextArea theme={currentTheme} value={config.character.customPersonality} onChange={e => handleNestedChange('character', 'customPersonality', e.target.value)} placeholder="Mô tả tính cách riêng..." rows={2} className="!text-xs" />
                              )}
                          </div>

                          <div className="mb-6">
                               <div className="flex justify-between mb-2">
                                   <SectionLabel icon="memory" label="Tiểu Sử & Ngoại Hình" theme={currentTheme} />
                                   <AiAssistButton isLoading={loadingStates['bio']} onClick={() => runAiAssist('bio', () => aiService.generateCharacterBio(config), res => handleNestedChange('character', 'bio', res))} className="!text-[10px] !py-1 !px-3 !bg-fuchsia-600/50 hover:!bg-fuchsia-500/50 border border-fuchsia-500/30">Viết tiểu sử</AiAssistButton>
                               </div>
                               <GlassTextArea theme={currentTheme} value={config.character.bio} onChange={e => handleNestedChange('character', 'bio', e.target.value)} className="min-h-[100px]" placeholder="Quá khứ, đặc điểm ngoại hình..." />
                          </div>

                          <div className="mb-8">
                               <div className="flex justify-between mb-2">
                                   <SectionLabel icon="goal" label="Mục Tiêu / Động Lực" theme={currentTheme} />
                                   <AiAssistButton isLoading={loadingStates['motivation']} onClick={() => runAiAssist('motivation', () => aiService.generateCharacterMotivation(config), res => handleNestedChange('character', 'motivation', res))} className="!text-[10px] !py-1 !px-3 !bg-fuchsia-600/50 hover:!bg-fuchsia-500/50 border border-fuchsia-500/30">Gợi ý</AiAssistButton>
                               </div>
                               <GlassTextArea theme={currentTheme} value={config.character.motivation} onChange={e => handleNestedChange('character', 'motivation', e.target.value)} rows={2} placeholder="Điều gì thúc đẩy nhân vật dấn thân?" />
                          </div>
                          
                          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-6 rounded-2xl border border-indigo-500/20 mb-8 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                              <div className="flex justify-between items-center mb-4 relative z-10">
                                  <SectionLabel icon="magic" label="Kỹ Năng Khởi Đầu (Đặc Biệt)" theme={currentTheme} />
                                  <AiAssistButton isLoading={loadingStates['skills']} onClick={() => runAiAssist('skills', () => aiService.generateCharacterSkills(config), res => setConfig(prev => ({...prev, character: {...prev.character, skills: res}})))} className="!text-[10px] !py-1 !px-3 !bg-indigo-600 hover:!bg-indigo-500">Tạo kỹ năng</AiAssistButton>
                              </div>
                              <div className="relative z-10">
                                  <input 
                                      value={config.character.skills.name} 
                                      onChange={e => setConfig(p => ({...p, character: {...p.character, skills: {...p.character.skills, name: e.target.value}}}))} 
                                      className="w-full bg-transparent border-b border-indigo-500/30 px-0 py-2 mb-2 font-bold text-indigo-300 text-lg placeholder:text-indigo-500/30 focus:outline-none focus:border-indigo-400 transition-colors" 
                                      placeholder="Tên kỹ năng"
                                  />
                                  <textarea 
                                      value={config.character.skills.description} 
                                      onChange={e => setConfig(p => ({...p, character: {...p.character, skills: {...p.character.skills, description: e.target.value}}}))} 
                                      className="w-full bg-transparent border-none px-0 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:ring-0 resize-none" 
                                      placeholder="Mô tả hiệu ứng và cách sử dụng..." 
                                      rows={2}
                                  />
                              </div>
                          </div>

                          <div className="border-t border-white/5 pt-6">
                              <div className="flex justify-between items-center mb-4">
                                  <SectionLabel icon="companions" label="Mối Quan Hệ" theme={currentTheme} />
                                  <Button onClick={() => setConfig(p => ({...p, character: {...p.character, relationships: [...p.character.relationships, {name: '', type: 'Bạn', description: ''}]}}))} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-[10px] rounded-lg">Thêm</Button>
                              </div>
                              {config.character.relationships.map((rel, idx) => (
                                  <div key={idx} className="flex gap-3 mb-3 items-start p-3 bg-slate-900/20 rounded-xl border border-white/5 hover:border-fuchsia-500/20 transition-colors">
                                      <div className="flex-1 space-y-2">
                                           <div className="flex gap-2">
                                              <input value={rel.name} onChange={e => {const n=[...config.character.relationships]; n[idx].name=e.target.value; setConfig(p=>({...p, character: {...p.character, relationships: n}}))}} className="flex-1 bg-transparent border-b border-white/10 focus:border-fuchsia-500/50 text-sm font-bold text-slate-200 placeholder:text-slate-600 px-1 py-1 focus:outline-none" placeholder="Tên"/>
                                              <input value={rel.type} onChange={e => {const n=[...config.character.relationships]; n[idx].type=e.target.value; setConfig(p=>({...p, character: {...p.character, relationships: n}}))}} className="w-24 bg-transparent border-b border-white/10 focus:border-fuchsia-500/50 text-xs text-fuchsia-300 placeholder:text-fuchsia-500/30 px-1 py-1 focus:outline-none text-right" placeholder="Loại (VD: Bạn)"/>
                                           </div>
                                           <input value={rel.description} onChange={e => {const n=[...config.character.relationships]; n[idx].description=e.target.value; setConfig(p=>({...p, character: {...p.character, relationships: n}}))}} className="w-full bg-transparent border-none text-xs text-slate-400 placeholder:text-slate-700 px-1 py-0 focus:ring-0" placeholder="Mô tả mối quan hệ..."/>
                                      </div>
                                      <button onClick={() => setConfig(p => ({...p, character: {...p.character, relationships: p.character.relationships.filter((_,i)=>i!==idx)}}))} className="text-slate-600 hover:text-red-400 p-1 mt-1"><Icon name="trash" className="w-4 h-4"/></button>
                                  </div>
                              ))}
                              {config.character.relationships.length === 0 && <p className="text-center text-xs text-slate-600 italic">Chưa có mối quan hệ nào.</p>}
                          </div>
                      </GlassSection>
                  )}

                  {/* TAB 4: ASSETS & ENTITIES */}
                  {activeTab === 'assets' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Tài Sản & NPC" subtitle="Hành trang khởi đầu và các thực thể trong thế giới." theme={currentTheme} />
                          
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
                                    {config.character.inventory.length === 0 && <div className="col-span-2 text-center text-xs text-slate-600 italic border border-dashed border-white/5 rounded-xl py-4">Hành trang trống</div>}
                                </div>
                          </div>

                          <div className="border-t border-white/5 pt-8">
                              <div className="flex justify-between items-center mb-6">
                                  <SectionLabel icon="entity" label="Thực Thể Khởi Đầu (NPC, Địa điểm)" theme={currentTheme} />
                                  <Button onClick={() => handleSimpleChange('initialEntities', [...config.initialEntities, { name: '', type: 'NPC', personality: '', description: '' }])} variant="secondary" fullWidth={false} className="!py-2 !px-4 !text-xs rounded-full"><Icon name="plus" className="w-3.5 h-3.5 mr-2"/> Thêm Thực Thể</Button>
                              </div>
                              <div className="space-y-6">
                                  {config.initialEntities.map((entity, idx) => (
                                      <div key={idx} className="bg-slate-900/30 rounded-2xl p-5 border border-white/5 relative group hover:border-amber-500/30 transition-all">
                                          <button onClick={() => handleSimpleChange('initialEntities', config.initialEntities.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash" className="w-4 h-4"/></button>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                              <div className="md:col-span-4 space-y-3">
                                                  <div>
                                                      <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tên & Loại</label>
                                                      <GlassInput theme={currentTheme} value={entity.name} onChange={e => handleEntityChange(idx, 'name', e.target.value)} className="font-bold mb-2 !bg-slate-950/50" placeholder="Tên thực thể" />
                                                      <GlassSelect theme={currentTheme} value={entity.type} onChange={e => handleEntityChange(idx, 'type', e.target.value)} className="!py-2 !text-xs !bg-slate-950/50">
                                                          {ENTITY_TYPE_OPTIONS.map(o=><option key={o} className="bg-slate-900">{o}</option>)}
                                                      </GlassSelect>
                                                  </div>
                                                  <AiAssistButton isLoading={loadingStates[`ent_name_${idx}`]} onClick={() => runAiAssist(`ent_name_${idx}`, () => aiService.generateEntityName(config, entity), res => handleEntityChange(idx, 'name', res))} isFullWidth className="!text-[10px] !py-1.5 !bg-amber-700 hover:!bg-amber-600">Gợi ý Tên</AiAssistButton>
                                              </div>
                                              <div className="md:col-span-8 flex flex-col h-full">
                                                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Mô tả chi tiết</label>
                                                  <GlassTextArea theme={currentTheme} value={entity.description} onChange={e => handleEntityChange(idx, 'description', e.target.value)} className="flex-1 !bg-slate-950/50 min-h-[100px]" placeholder={`Mô tả về ${entity.type.toLowerCase()} này...`}/>
                                                  <div className="flex justify-end mt-2">
                                                      <AiAssistButton isLoading={loadingStates[`ent_desc_${idx}`]} onClick={() => runAiAssist(`ent_desc_${idx}`, () => aiService.generateEntityDescription(config, entity), res => handleEntityChange(idx, 'description', res))} className="!text-[10px] !py-1 !px-3 !bg-amber-700/50 hover:!bg-amber-600/50 border border-amber-500/30">Viết mô tả</AiAssistButton>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                  {config.initialEntities.length === 0 && <p className="text-center text-xs text-slate-600 italic py-6 border border-dashed border-white/5 rounded-2xl">Chưa có thực thể nào được thêm.</p>}
                              </div>
                          </div>
                      </GlassSection>
                  )}

                  {/* TAB 5: NARRATIVE */}
                  {activeTab === 'narrative' && (
                      <GlassSection theme={currentTheme}>
                          <Header title="Kịch Bản & Lời Dẫn" subtitle="Thiết lập phong cách kể chuyện và điểm khởi đầu." theme={currentTheme} />
                          
                          <div className="mb-8">
                              <SectionLabel icon="play" label="Kịch Bản Khởi Đầu" theme={currentTheme} />
                              <GlassSelect theme={currentTheme} value={config.startingScenario} onChange={e => handleSimpleChange('startingScenario', e.target.value)}>
                                  {STARTING_SCENARIO_OPTIONS.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                              </GlassSelect>
                          </div>

                          <div className="bg-gradient-to-br from-cyan-900/10 to-blue-900/10 p-8 rounded-3xl border border-cyan-500/10">
                               <div className="flex items-center gap-2 mb-6 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                                   <Icon name="news" className="w-4 h-4" /> Cấu Hình Văn Phong AI
                               </div>
                               
                               <div className="space-y-8">
                                   <div>
                                       <label className="text-sm font-bold text-slate-300 mb-3 block">Góc Nhìn (Ngôi Kể)</label>
                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                           {PERSPECTIVE_OPTIONS.map(opt => (
                                               <button 
                                                    key={opt.value}
                                                    onClick={() => handleWritingChange('perspective', opt.value as any)}
                                                    className={`
                                                        relative p-4 rounded-xl text-xs font-bold border transition-all duration-300
                                                        ${config.writingConfig.perspective === opt.value 
                                                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/20' 
                                                            : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10'
                                                        }
                                                    `}
                                               >
                                                   <span className="block text-sm mb-1">{opt.label.split(' - ')[0]}</span>
                                                   <span className="block text-[10px] opacity-60 font-normal">{opt.label.split(' - ')[1]}</span>
                                                   {config.writingConfig.perspective === opt.value && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-md"></div>}
                                               </button>
                                           ))}
                                       </div>
                                   </div>

                                   <div>
                                       <label className="text-sm font-bold text-slate-300 mb-3 block">Phong Cách Kể Chuyện (Tone & Style)</label>
                                       <GlassInput theme={currentTheme} value={config.writingConfig.narrativeStyle} onChange={e => handleWritingChange('narrativeStyle', e.target.value)} placeholder="VD: Đen tối, trinh thám, hài hước, văn hoa, Lovecraftian..." />
                                       <p className="text-[10px] text-slate-500 mt-2">Mô tả ngắn gọn về giọng văn bạn muốn AI sử dụng.</p>
                                   </div>
                               </div>
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
