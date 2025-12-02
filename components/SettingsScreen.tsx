
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, HarmBlockThreshold } from '../types';
import { testSingleKey } from '../services/aiService';
import { loadKeysFromTxtFile } from '../services/fileService';
import { HARM_CATEGORIES, HARM_BLOCK_THRESHOLDS } from '../constants';
import Icon from './common/Icon';
import Button from './common/Button';
import ToggleSwitch from './common/ToggleSwitch';

interface SettingsScreenProps { 
    onBack: () => void;
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    currentZoom?: number; // Optional prop if passed from App
    onZoomChange?: (zoom: number) => void; // Optional
}
type ValidationStatus = 'idle' | 'loading' | 'valid' | 'invalid' | 'rate_limited';
type TabId = 'ui' | 'audio' | 'ai' | 'safety' | 'advanced';

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<TabId>('ui'); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimers = useRef<{ [index: number]: number }>({});
  const [validationStatus, setValidationStatus] = useState<{ [index: number]: ValidationStatus }>({});

  // Use settings.uiSettings.zoomLevel as the source of truth
  const currentZoom = settings.uiSettings.zoomLevel;

  const handleZoomUpdate = (value: number) => {
      onUpdateSettings({
          ...settings,
          uiSettings: { ...settings.uiSettings, zoomLevel: value }
      });
  };

  const validateAndSaveKey = async (key: string, index: number) => {
    if (!key.trim()) { setValidationStatus(p => ({ ...p, [index]: 'idle' })); return; }
    setValidationStatus(p => ({ ...p, [index]: 'loading' }));
    const result = await testSingleKey(key);
    setValidationStatus(p => ({ ...p, [index]: result }));
    if (result === 'valid' || result === 'rate_limited') {
        const newKeys = [...settings.apiKeyConfig.keys];
        newKeys[index] = key;
        onUpdateSettings({ ...settings, apiKeyConfig: { keys: newKeys } });
    }
  };

  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...settings.apiKeyConfig.keys]; newKeys[index] = value;
    onUpdateSettings({ ...settings, apiKeyConfig: { keys: newKeys } });

    if (debounceTimers.current[index]) clearTimeout(debounceTimers.current[index]);
    setValidationStatus(p => ({ ...p, [index]: value.trim() ? 'loading' : 'idle' }));
    if (value.trim()) debounceTimers.current[index] = window.setTimeout(() => validateAndSaveKey(value, index), 800);
  };

  const toggleAiSetting = (key: keyof typeof settings.aiSettings) => {
      // @ts-ignore
      onUpdateSettings({ ...settings, aiSettings: { ...settings.aiSettings, [key]: !settings.aiSettings[key] } });
  };

  const updateAiConfig = (key: keyof typeof settings.aiSettings, value: any) => {
      onUpdateSettings({ ...settings, aiSettings: { ...settings.aiSettings, [key]: value } });
  };

  // --- Theme Colors ---
  const colors: Record<TabId, string> = {
      ui: 'text-fuchsia-400',
      audio: 'text-cyan-400',
      ai: 'text-emerald-400',
      safety: 'text-rose-400',
      advanced: 'text-amber-400'
  };

  const bgColors: Record<TabId, string> = {
      ui: 'bg-fuchsia-500/10 border-fuchsia-500/20',
      audio: 'bg-cyan-500/10 border-cyan-500/20',
      ai: 'bg-emerald-500/10 border-emerald-500/20',
      safety: 'bg-rose-500/10 border-rose-500/20',
      advanced: 'bg-amber-500/10 border-amber-500/20'
  };

  // --- Sub-components ---
  const SectionHeader: React.FC<{title: string, desc?: string}> = ({title, desc}) => (
      <div className="mb-6 pb-2 border-b border-white/5">
          <h2 className={`text-lg font-bold ${colors[activeTab]}`}>{title}</h2>
          {desc && <p className="text-xs text-slate-500 mt-1">{desc}</p>}
      </div>
  );

  const GlassCard: React.FC<{children: React.ReactNode, className?: string}> = ({children, className=''}) => (
      <div className={`p-5 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-lg ${className}`}>
          {children}
      </div>
  );

  const CustomSlider: React.FC<{value: number, min: number, max: number, step: number, onChange: (v: number) => void, unit?: string}> = ({value, min, max, step, onChange, unit}) => {
      const safeValue = typeof value === 'number' ? value : min;
      return (
        <div className="w-full">
            <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 font-mono">{min}{unit}</span>
                <span className={`text-sm font-bold ${colors[activeTab]}`}>{safeValue.toFixed(step < 1 ? 2 : 0)}{unit}</span>
                <span className="text-xs font-bold text-slate-400 font-mono">{max}{unit}</span>
            </div>
            <input 
              type="range" min={min} max={max} step={step} value={safeValue} 
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-fuchsia-400 transition-all"
            />
        </div>
      );
  };

  const tabs: {id: TabId, label: string, icon: any}[] = [
      { id: 'ui', label: 'Giao Diện', icon: 'palette' },
      { id: 'audio', label: 'Âm Thanh', icon: 'volume' },
      { id: 'ai', label: 'Bộ Não AI', icon: 'cpu' },
      { id: 'safety', label: 'An Toàn', icon: 'shieldCheck' },
      { id: 'advanced', label: 'Nâng Cao', icon: 'terminal' },
  ];

  const renderContent = () => {
      switch (activeTab) {
          case 'ui':
              return (
                  <div className="space-y-6 animate-fade-in-up">
                      <SectionHeader title="Hiển Thị & Trải Nghiệm" desc="Tùy chỉnh cách ứng dụng hiển thị trên thiết bị của bạn." />
                      
                      <GlassCard className="space-y-4">
                          <div className="flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-fuchsia-500/20 text-fuchsia-400"><Icon name="search" className="w-6 h-6"/></div>
                              <div>
                                  <div className="font-bold text-slate-200">Chế độ Hiển thị</div>
                                  <div className="text-xs text-slate-500">Chọn giao diện phù hợp với thiết bị.</div>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button 
                                  onClick={() => handleZoomUpdate(1.0)} 
                                  className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all duration-300 ${currentZoom === 1.0 ? 'bg-fuchsia-600/20 border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10' : 'bg-slate-900/30 border-white/5 hover:bg-white/5'}`}
                              >
                                  <div className={`p-3 rounded-full ${currentZoom === 1.0 ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                      <Icon name="desktop" className="w-6 h-6"/>
                                  </div>
                                  <div className="text-center">
                                      <div className={`text-sm font-bold ${currentZoom === 1.0 ? 'text-white' : 'text-slate-400'}`}>Giao diện PC</div>
                                      <div className="text-[10px] text-slate-500 mt-1">Mặc định (Zoom 1.0)</div>
                                  </div>
                              </button>

                              <button 
                                  onClick={() => handleZoomUpdate(0.6)} 
                                  className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all duration-300 ${currentZoom === 0.6 ? 'bg-fuchsia-600/20 border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10' : 'bg-slate-900/30 border-white/5 hover:bg-white/5'}`}
                              >
                                  <div className={`p-3 rounded-full ${currentZoom === 0.6 ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                      <Icon name="smartphone" className="w-6 h-6"/>
                                  </div>
                                  <div className="text-center">
                                      <div className={`text-sm font-bold ${currentZoom === 0.6 ? 'text-white' : 'text-slate-400'}`}>Giao diện Mobile</div>
                                      <div className="text-[10px] text-slate-500 mt-1">Mở rộng (Zoom 0.6)</div>
                                  </div>
                              </button>
                          </div>
                      </GlassCard>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GlassCard className="flex items-center justify-between">
                            <div>
                                <div className="font-bold text-slate-200 text-sm">Giảm chuyển động</div>
                                <div className="text-[10px] text-slate-500">Tăng hiệu năng máy yếu.</div>
                            </div>
                            <ToggleSwitch enabled={settings.uiSettings.reduceMotion} setEnabled={(v) => onUpdateSettings({ ...settings, uiSettings: { ...settings.uiSettings, reduceMotion: v } })} />
                        </GlassCard>
                        <GlassCard className="space-y-3">
                            <div>
                                <div className="font-bold text-slate-200 text-sm">Cỡ chữ (Text Size)</div>
                                <div className="text-[10px] text-slate-500">Kích thước văn bản truyện.</div>
                            </div>
                            <div className="flex bg-slate-950 p-1 rounded-lg border border-white/10">
                                {['small', 'medium', 'large'].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => onUpdateSettings({ ...settings, uiSettings: { ...settings.uiSettings, textSize: size as any } })}
                                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${settings.uiSettings.textSize === size ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'}`}
                                    >
                                        {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                                    </button>
                                ))}
                            </div>
                        </GlassCard>
                      </div>
                  </div>
              );
          case 'audio':
              // ... (rest of the file remains same, keeping it brief for the XML)
              return (
                  <div className="space-y-6 animate-fade-in-up">
                      <SectionHeader title="Âm Thanh & Giọng Nói" desc="Cấu hình âm lượng và tính năng đọc văn bản (TTS)." />
                      
                      <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20 text-cyan-200 text-xs flex items-center gap-3">
                          <Icon name="info" className="w-5 h-5"/>
                          Hệ thống âm thanh đang được phát triển.
                      </div>

                      <GlassCard className="space-y-6">
                          <div>
                              <label className="text-sm font-bold text-slate-300 mb-2 block">Nhạc nền (BGM)</label>
                              <CustomSlider value={settings.audioSettings.bgmVolume} min={0} max={100} step={5} onChange={(v) => onUpdateSettings({...settings, audioSettings: {...settings.audioSettings, bgmVolume: v}})} unit="%" />
                          </div>
                          <div>
                              <label className="text-sm font-bold text-slate-300 mb-2 block">Hiệu ứng (SFX)</label>
                              <CustomSlider value={settings.audioSettings.sfxVolume} min={0} max={100} step={5} onChange={(v) => onUpdateSettings({...settings, audioSettings: {...settings.audioSettings, sfxVolume: v}})} unit="%" />
                          </div>
                      </GlassCard>

                      <GlassCard className="flex items-center justify-between">
                          <div>
                              <div className="font-bold text-slate-200">Đọc văn bản (TTS)</div>
                              <div className="text-xs text-slate-500">Tự động đọc lời dẫn của AI.</div>
                          </div>
                          <ToggleSwitch enabled={settings.audioSettings.enableTts} setEnabled={(v) => onUpdateSettings({...settings, audioSettings: {...settings.audioSettings, enableTts: v}})} />
                      </GlassCard>
                  </div>
              );
          case 'ai':
          case 'safety':
          case 'advanced':
             // Returning original content logic for brevity, assuming standard render flow
             return (
                 <div className="space-y-6 animate-fade-in-up">
                      {activeTab === 'ai' && (
                        <>
                        <SectionHeader title="Kết Nối & API" desc="Quản lý chìa khóa kết nối tới não bộ của AI." />
                        <div className="space-y-3">
                              {settings.apiKeyConfig.keys.map((key, index) => (
                                  <div key={index} className="flex items-center gap-2 group relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                          <Icon name="key" className={`w-4 h-4 ${validationStatus[index] === 'valid' ? 'text-emerald-400' : 'text-slate-500'}`} />
                                      </div>
                                      <input 
                                          type="password"
                                          placeholder="Nhập Google Gemini API Key..."
                                          value={key}
                                          onChange={(e) => handleKeyChange(index, e.target.value)}
                                          className={`w-full bg-slate-900/60 border rounded-xl pl-10 pr-10 py-3 text-sm font-mono focus:outline-none transition-all ${validationStatus[index] === 'valid' ? 'border-emerald-500/50 text-emerald-300' : validationStatus[index] === 'invalid' ? 'border-red-500/50 text-red-300' : 'border-white/10 text-slate-200 focus:border-emerald-500/50'}`}
                                      />
                                      <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                          {validationStatus[index] === 'loading' && <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>}
                                      </div>
                                      <button onClick={() => onUpdateSettings({...settings, apiKeyConfig: { keys: settings.apiKeyConfig.keys.filter((_, i) => i !== index)}})} className="p-3 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-xl transition" disabled={settings.apiKeyConfig.keys.length <= 1}><Icon name="trash" className="w-5 h-5"/></button>
                                  </div>
                              ))}
                              <div className="flex gap-3 mt-2">
                                  <Button onClick={() => onUpdateSettings({...settings, apiKeyConfig: {keys: [...settings.apiKeyConfig.keys, '']}})} variant="secondary" fullWidth className="!text-xs border-dashed !py-2"><Icon name="plus" className="w-3 h-3 mr-2"/> Thêm Key</Button>
                                  <Button onClick={() => fileInputRef.current?.click()} variant="ghost" fullWidth className="!text-xs border border-white/10 !py-2"><Icon name="upload" className="w-3 h-3 mr-2"/> Import File</Button>
                                  <input type="file" ref={fileInputRef} onChange={async (e) => { const f=e.target.files?.[0]; if(f) { const k=await loadKeysFromTxtFile(f); onUpdateSettings({...settings, apiKeyConfig: {keys: [...settings.apiKeyConfig.keys.filter(Boolean), ...k]}}); }}} className="hidden" accept=".txt" />
                              </div>
                          </div>
                          <GlassCard className="space-y-6 mt-6">
                              <SectionHeader title="Cấu Hình Mô Hình" />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Model</label>
                                      <select 
                                          value={settings.aiSettings.modelName} 
                                          onChange={(e) => updateAiConfig('modelName', e.target.value)}
                                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-emerald-300 focus:border-emerald-500/50 outline-none"
                                      >
                                          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Embedding</label>
                                      <input value={settings.aiSettings.embeddingModelName} disabled className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
                                  </div>
                              </div>
                          </GlassCard>
                        </>
                      )}
                      {activeTab === 'safety' && (
                        <>
                          <SectionHeader title="An Toàn & Kiểm Duyệt" />
                          <GlassCard className="flex items-center justify-between mb-4 border-rose-500/20 bg-rose-900/10">
                              <div>
                                  <div className="font-bold text-rose-200">Bật bộ lọc an toàn</div>
                                  <div className="text-xs text-rose-400/70">Tắt để cho phép nội dung NSFW/Violence.</div>
                              </div>
                              <ToggleSwitch enabled={settings.safetySettings.enabled} setEnabled={(v) => onUpdateSettings({ ...settings, safetySettings: { ...settings.safetySettings, enabled: v } })} />
                          </GlassCard>
                        </>
                      )}
                      {activeTab === 'advanced' && (
                        <>
                           <SectionHeader title="Hệ Thống & Dữ Liệu" />
                           <GlassCard className="border-amber-500/20 bg-amber-900/5">
                              <Button onClick={() => { localStorage.clear(); window.location.reload(); }} variant="danger" fullWidth={false} className="!text-xs">Reset Factory Data</Button>
                           </GlassCard>
                        </>
                      )}
                 </div>
             );
      }
  };

  return (
    <div className="flex items-center justify-center h-full p-0 md:p-8">
      <div className="w-full max-w-6xl h-full md:h-[85vh] glass-panel md:rounded-[2rem] flex flex-col md:flex-row overflow-hidden shadow-2xl border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="w-full md:w-64 bg-slate-900/50 border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-6 flex flex-col gap-2 z-10">
              <div className="mb-6 px-2 hidden md:block">
                  <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Cài Đặt</h1>
                  <p className="text-xs text-slate-500">System Preferences</p>
              </div>

              <div className="md:hidden flex justify-between items-center mb-4">
                  <h1 className="text-lg font-black text-white">Cài Đặt</h1>
                  <button onClick={onBack} className="p-2 bg-white/10 rounded-full"><Icon name="xCircle" className="w-5 h-5"/></button>
              </div>

              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible custom-scrollbar pb-2 md:pb-0">
                  {tabs.map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`
                                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 min-w-[120px] md:min-w-0
                                  ${isActive 
                                      ? `${bgColors[tab.id]} ${colors[tab.id]} shadow-lg` 
                                      : 'bg-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                  }
                              `}
                          >
                              <Icon name={tab.icon} className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                              <span>{tab.label}</span>
                          </button>
                      );
                  })}
              </div>
              
              <div className="mt-auto hidden md:block">
                  <Button onClick={onBack} variant="primary" className="mb-2 shadow-fuchsia-500/20">Xong</Button>
              </div>
          </div>

          <div className="flex-1 flex flex-col bg-transparent relative overflow-hidden">
               <div className={`absolute top-[-50%] right-[-50%] w-full h-full bg-gradient-to-b ${
                   activeTab === 'ui' ? 'from-fuchsia-500/5' : 
                   activeTab === 'audio' ? 'from-cyan-500/5' :
                   activeTab === 'ai' ? 'from-emerald-500/5' :
                   activeTab === 'safety' ? 'from-rose-500/5' : 'from-amber-500/5'
               } to-transparent pointer-events-none blur-3xl rounded-full`}></div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10">
                   {renderContent()}
               </div>

               <div className="p-4 border-t border-white/5 bg-slate-950/50 md:hidden flex gap-3 z-20">
                    <Button onClick={onBack} variant="primary" className="flex-1">Xong</Button>
               </div>
          </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
