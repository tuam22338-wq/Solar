import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, HarmBlockThreshold } from '../types';
import { getSettings, saveSettings } from '../services/settingsService';
import { testSingleKey } from '../services/aiService';
import { loadKeysFromTxtFile } from '../services/fileService';
import { HARM_CATEGORIES, HARM_BLOCK_THRESHOLDS, DEFAULT_SAFETY_SETTINGS, DEFAULT_AI_SETTINGS, DEFAULT_SETTINGS } from '../constants';
import Icon from './common/Icon';
import Button from './common/Button';
import ToggleSwitch from './common/ToggleSwitch';

interface SettingsScreenProps { onBack: () => void; }
type ValidationStatus = 'idle' | 'loading' | 'valid' | 'invalid' | 'rate_limited';
type TabId = 'ui' | 'audio' | 'ai' | 'safety' | 'advanced';

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabId>('ai'); // Default to AI
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimers = useRef<{ [index: number]: number }>({});
  const [validationStatus, setValidationStatus] = useState<{ [index: number]: ValidationStatus }>({});

  useEffect(() => {
    const loaded = getSettings();
    if (loaded.apiKeyConfig.keys.length === 0) loaded.apiKeyConfig.keys.push('');
    // Ensure all fields exist when loading old settings
    setSettings({ ...DEFAULT_SETTINGS, ...loaded, aiSettings: { ...DEFAULT_SETTINGS.aiSettings, ...loaded.aiSettings }, uiSettings: { ...DEFAULT_SETTINGS.uiSettings, ...loaded.uiSettings }, audioSettings: { ...DEFAULT_SETTINGS.audioSettings, ...loaded.audioSettings } });
  }, []);

  const handleSave = () => {
    saveSettings({ ...settings, apiKeyConfig: { keys: settings.apiKeyConfig.keys.filter(Boolean) } });
    onBack();
  };
  
  const validateAndSaveKey = async (key: string, index: number) => {
    if (!key.trim()) { setValidationStatus(p => ({ ...p, [index]: 'idle' })); return; }
    setValidationStatus(p => ({ ...p, [index]: 'loading' }));
    const result = await testSingleKey(key);
    setValidationStatus(p => ({ ...p, [index]: result }));
    if (result === 'valid' || result === 'rate_limited') {
        setSettings(prev => {
             const newKeys = [...prev.apiKeyConfig.keys]; 
             if(newKeys[index] === key) saveSettings({ ...prev, apiKeyConfig: { keys: newKeys } });
             return prev;
        });
    }
  };

  const handleKeyChange = (index: number, value: string) => {
    const newKeys = [...settings.apiKeyConfig.keys]; newKeys[index] = value;
    setSettings(p => ({ ...p, apiKeyConfig: { keys: newKeys } }));
    if (debounceTimers.current[index]) clearTimeout(debounceTimers.current[index]);
    setValidationStatus(p => ({ ...p, [index]: value.trim() ? 'loading' : 'idle' }));
    if (value.trim()) debounceTimers.current[index] = window.setTimeout(() => validateAndSaveKey(value, index), 800);
  };

  const toggleAiSetting = (key: keyof typeof settings.aiSettings) => {
      // @ts-ignore
      setSettings(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, [key]: !prev.aiSettings[key] } }));
  };

  const updateAiConfig = (key: keyof typeof settings.aiSettings, value: any) => {
      setSettings(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, [key]: value } }));
  };

  const tabs: {id: TabId, label: string, icon: any}[] = [
      { id: 'ui', label: 'Giao Diện', icon: 'palette' },
      { id: 'audio', label: 'Âm Thanh', icon: 'volume' },
      { id: 'ai', label: 'AI Engine', icon: 'cpu' },
      { id: 'safety', label: 'Bộ Lọc', icon: 'shieldCheck' },
      { id: 'advanced', label: 'Nâng Cao', icon: 'terminal' },
  ];

  const renderContent = () => {
      switch (activeTab) {
          case 'ui':
              return (
                  <div className="space-y-6 animate-fade-in-up">
                      <h2 className="text-xl font-bold text-fuchsia-300 mb-4">Tùy Chỉnh Giao Diện</h2>
                      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                          <div>
                              <div className="font-bold text-slate-200">Giảm chuyển động (Reduce Motion)</div>
                              <div className="text-xs text-slate-500">Tắt các hiệu ứng hoạt ảnh phức tạp để tăng hiệu năng.</div>
                          </div>
                          <ToggleSwitch enabled={settings.uiSettings.reduceMotion} setEnabled={(v) => setSettings(p => ({...p, uiSettings: {...p.uiSettings, reduceMotion: v}}))} />
                      </div>
                       <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                          <div>
                              <div className="font-bold text-slate-200">Kích thước chữ (Text Size)</div>
                              <div className="text-xs text-slate-500">Điều chỉnh độ lớn văn bản hiển thị.</div>
                          </div>
                          <select 
                              value={settings.uiSettings.textSize}
                              onChange={(e) => setSettings(p => ({...p, uiSettings: {...p.uiSettings, textSize: e.target.value as any}}))}
                              className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1 text-sm focus:outline-none"
                          >
                              <option value="small">Nhỏ</option>
                              <option value="medium">Vừa</option>
                              <option value="large">Lớn</option>
                          </select>
                      </div>
                      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between opacity-60 pointer-events-none grayscale">
                           <div>
                              <div className="font-bold text-slate-200">Màu chủ đạo (Theme)</div>
                              <div className="text-xs text-slate-500">Tính năng đang phát triển.</div>
                          </div>
                          <div className="flex gap-2">
                              {['bg-fuchsia-500', 'bg-cyan-500', 'bg-emerald-500'].map(bg => (
                                  <div key={bg} className={`w-6 h-6 rounded-full ${bg} border-2 border-white/20`}></div>
                              ))}
                          </div>
                      </div>
                  </div>
              );
          case 'audio':
              return (
                  <div className="space-y-6 animate-fade-in-up">
                      <h2 className="text-xl font-bold text-cyan-300 mb-4">Cấu Hình Âm Thanh</h2>
                      <div className="p-4 rounded-xl bg-cyan-900/10 border border-cyan-500/20 text-cyan-200 text-sm flex items-center gap-3">
                          <Icon name="info" className="w-5 h-5"/>
                          Hệ thống âm thanh đang được phát triển và sẽ sớm ra mắt.
                      </div>
                      <div className="glass-panel p-6 rounded-2xl opacity-70">
                          <div className="mb-4">
                              <div className="flex justify-between mb-2">
                                  <label className="text-sm font-bold text-slate-300">Nhạc nền (BGM)</label>
                                  <span className="text-xs text-cyan-400">{settings.audioSettings.bgmVolume}%</span>
                              </div>
                              <input type="range" min="0" max="100" value={settings.audioSettings.bgmVolume} onChange={(e) => setSettings(p => ({...p, audioSettings: {...p.audioSettings, bgmVolume: Number(e.target.value)}}))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                          </div>
                          <div>
                              <div className="flex justify-between mb-2">
                                  <label className="text-sm font-bold text-slate-300">Hiệu ứng (SFX)</label>
                                  <span className="text-xs text-cyan-400">{settings.audioSettings.sfxVolume}%</span>
                              </div>
                              <input type="range" min="0" max="100" value={settings.audioSettings.sfxVolume} onChange={(e) => setSettings(p => ({...p, audioSettings: {...p.audioSettings, sfxVolume: Number(e.target.value)}}))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                          </div>
                      </div>
                      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between opacity-70">
                          <div>
                              <div className="font-bold text-slate-200">Đọc văn bản (Text-to-Speech)</div>
                              <div className="text-xs text-slate-500">Tự động đọc lời dẫn của AI.</div>
                          </div>
                          <ToggleSwitch enabled={settings.audioSettings.enableTts} setEnabled={(v) => setSettings(p => ({...p, audioSettings: {...p.audioSettings, enableTts: v}}))} />
                      </div>
                  </div>
              );
          case 'ai':
              return (
                  <div className="space-y-8 animate-fade-in-up">
                       {/* API Keys Section (Moved Here) */}
                       <div>
                          <div className="flex justify-between items-end mb-4">
                              <div>
                                  <h2 className="text-xl font-bold text-emerald-300 flex items-center gap-2">API Keys & Kết Nối</h2>
                                  <p className="text-xs text-slate-500 mt-1">Quản lý Google Gemini API Key.</p>
                              </div>
                              <div className="flex gap-2">
                                   <Button onClick={() => fileInputRef.current?.click()} variant="secondary" fullWidth={false} className="!py-1.5 !px-3 !text-xs"><Icon name="upload" className="w-3 h-3 mr-1"/> Import .txt</Button>
                                   <input type="file" ref={fileInputRef} onChange={async (e) => { const f=e.target.files?.[0]; if(f) { const k=await loadKeysFromTxtFile(f); setSettings(p=>({...p, apiKeyConfig: {keys: [...p.apiKeyConfig.keys.filter(Boolean), ...k]}})); }}} className="hidden" accept=".txt" />
                              </div>
                          </div>
                          
                          <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar p-1">
                              {settings.apiKeyConfig.keys.map((key, index) => (
                                  <div key={index} className="flex items-center gap-2 group">
                                      <div className="relative flex-grow">
                                          <input 
                                              type="password"
                                              placeholder="Nhập API Key..."
                                              value={key}
                                              onChange={(e) => handleKeyChange(index, e.target.value)}
                                              className={`w-full glass-input rounded-xl px-4 py-3 text-sm tracking-wider font-mono ${validationStatus[index] === 'valid' ? 'border-emerald-500/50' : validationStatus[index] === 'invalid' ? 'border-red-500/50' : ''}`}
                                          />
                                          <div className="absolute right-3 top-3">
                                              {validationStatus[index] === 'loading' && <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>}
                                              {validationStatus[index] === 'valid' && <Icon name="checkCircle" className="w-5 h-5 text-emerald-400"/>}
                                              {validationStatus[index] === 'invalid' && <Icon name="xCircle" className="w-5 h-5 text-red-400"/>}
                                          </div>
                                      </div>
                                      <button onClick={() => setSettings(p => ({...p, apiKeyConfig: { keys: p.apiKeyConfig.keys.filter((_, i) => i !== index)}}))} className="p-3 text-slate-500 hover:text-red-400 bg-white/5 rounded-xl transition" disabled={settings.apiKeyConfig.keys.length <= 1}><Icon name="trash" className="w-5 h-5"/></button>
                                  </div>
                              ))}
                              <Button onClick={() => setSettings(p => ({...p, apiKeyConfig: {keys: [...p.apiKeyConfig.keys, '']}}))} variant="ghost" fullWidth className="border-dashed border border-white/10 opacity-50 hover:opacity-100 !text-xs">Thêm Key Mới</Button>
                          </div>
                       </div>

                       <div className="border-t border-white/5 pt-6"></div>

                       {/* Advanced AI Configuration */}
                       <div>
                            <h2 className="text-xl font-bold text-indigo-300 mb-4">Cấu Hình Model AI</h2>
                            <div className="glass-panel p-6 rounded-2xl space-y-6">
                                {/* Model Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm font-bold text-slate-300 block mb-2">Generative Model</label>
                                        <select 
                                            value={settings.aiSettings.modelName} 
                                            onChange={(e) => updateAiConfig('modelName', e.target.value)}
                                            className="w-full glass-input px-4 py-2 rounded-xl text-sm bg-slate-900"
                                        >
                                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Khuyên dùng)</option>
                                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Mới)</option>
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-300 block mb-2">Embedding Model</label>
                                        <input 
                                            type="text" 
                                            value={settings.aiSettings.embeddingModelName} 
                                            onChange={(e) => updateAiConfig('embeddingModelName', e.target.value)}
                                            placeholder="text-embedding-004"
                                            className="w-full glass-input px-4 py-2 rounded-xl text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Temperature & Top P/K */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-300">Temperature</label>
                                            <span className="text-xs text-indigo-400">{settings.aiSettings.temperature}</span>
                                        </div>
                                        <input type="range" min="0" max="2" step="0.1" value={settings.aiSettings.temperature} onChange={(e) => updateAiConfig('temperature', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
                                        <div className="text-[10px] text-slate-500 mt-1">Độ sáng tạo (0 = Logic, 2 = Ngẫu hứng).</div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-300">Top P</label>
                                            <span className="text-xs text-indigo-400">{settings.aiSettings.topP}</span>
                                        </div>
                                        <input type="range" min="0" max="1" step="0.05" value={settings.aiSettings.topP} onChange={(e) => updateAiConfig('topP', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-300">Top K</label>
                                            <span className="text-xs text-indigo-400">{settings.aiSettings.topK}</span>
                                        </div>
                                        <input type="range" min="1" max="100" step="1" value={settings.aiSettings.topK} onChange={(e) => updateAiConfig('topK', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
                                    </div>
                                </div>

                                {/* Tokens & Thinking */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-bold text-slate-300">Max Output Tokens</label>
                                            <span className="text-xs text-indigo-400">{settings.aiSettings.maxOutputTokens} tokens</span>
                                        </div>
                                        <input type="range" min="1000" max="8192" step="100" value={settings.aiSettings.maxOutputTokens} onChange={(e) => updateAiConfig('maxOutputTokens', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
                                        <div className="text-[10px] text-slate-500 mt-1">Độ dài phản hồi tối đa. (~{Math.round(settings.aiSettings.maxOutputTokens * 0.75)} từ)</div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-bold text-slate-300">Thinking Budget</label>
                                            <span className="text-xs text-indigo-400">{settings.aiSettings.thinkingBudget === 0 ? 'Tự động (Off)' : `${settings.aiSettings.thinkingBudget} tokens`}</span>
                                        </div>
                                        <input type="range" min="0" max="4000" step="100" value={settings.aiSettings.thinkingBudget} onChange={(e) => updateAiConfig('thinkingBudget', Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/>
                                        <div className="text-[10px] text-slate-500 mt-1">Ngân sách cho suy luận (CoT). Đặt 0 để tắt hoặc để model tự quyết định.</div>
                                    </div>
                                </div>
                            </div>
                       </div>

                       <div className="border-t border-white/5 pt-6"></div>

                       <h2 className="text-xl font-bold text-indigo-300 mb-4">Các Kỹ Thuật Logic (Modules)</h2>
                       <div className="p-4 rounded-xl bg-indigo-900/10 border border-indigo-500/20 text-indigo-200 text-xs mb-4">
                           Bật các module này sẽ tăng độ thông minh và chiều sâu của cốt truyện, nhưng có thể làm tăng thời gian phản hồi của AI.
                       </div>

                       {/* List of AI Settings */}
                       {[
                           { id: 'enableStoryGraph', title: 'StoryGraph + GraphRAG', desc: 'Mô hình hóa mối quan hệ nhân vật/sự kiện dưới dạng đồ thị để giữ tính nhất quán.' },
                           { id: 'enableMemoryBank', title: 'MemoryBank + Recursive Outlining', desc: 'Phân tầng bộ nhớ và lập dàn ý đệ quy cho các sự kiện tương lai.' },
                           { id: 'enableChainOfThought', title: 'Tree of Thoughts (ToT)', desc: 'Giả lập 3 nhánh cốt truyện, đánh giá và chọn phương án tối ưu nhất.' },
                           { id: 'enableSelfReflection', title: 'Self-RAG + Chain-of-Note', desc: 'AI tự đánh giá độ chính xác thông tin và ghi chú ý định người chơi.' },
                           { id: 'enableEnsembleModeling', title: 'Ensemble Modeling (Đa Nhân Cách)', desc: 'Tranh luận nội bộ giữa: Narrator (Văn phong), Designer (Luật) và Historian (Lore).' },
                           { id: 'enableEmotionalIntelligence', title: 'Emotional Intelligence (EQ)', desc: 'Phân tích biểu đồ cảm xúc để điều chỉnh giọng văn (Bi tráng, Hài hước...)' }
                       ].map((item) => (
                           <div key={item.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                               <div className="flex-1 pr-4">
                                   <h3 className="font-bold text-slate-200 text-sm mb-1 group-hover:text-indigo-300 transition-colors">{item.title}</h3>
                                   <p className="text-[10px] text-slate-500">{item.desc}</p>
                               </div>
                               <ToggleSwitch enabled={settings.aiSettings[item.id as keyof typeof settings.aiSettings]} setEnabled={() => toggleAiSetting(item.id as any)} />
                           </div>
                       ))}
                  </div>
              );
          case 'safety':
              return (
                  <div className="space-y-6 animate-fade-in-up">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-bold text-rose-300">Bộ Lọc Nội Dung</h2>
                          <ToggleSwitch enabled={settings.safetySettings.enabled} setEnabled={(v) => setSettings(p => ({...p, safetySettings: {...p.safetySettings, enabled: v}}))} />
                      </div>
                      <p className="text-xs text-slate-400 mb-6">Cấu hình bộ lọc kiểm duyệt của Google Gemini. Tắt bộ lọc để cho phép nội dung trưởng thành (NSFW/Violence) hoạt động mượt mà hơn.</p>
                      
                      <div className={`grid grid-cols-1 gap-4 transition-all ${!settings.safetySettings.enabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                          {settings.safetySettings.settings.map(({ category, threshold }) => (
                              <div key={category} className="glass-input p-4 rounded-xl border-white/5 bg-black/20 flex justify-between items-center">
                                  <label className="text-xs font-bold text-slate-300 uppercase">{HARM_CATEGORIES[category]}</label>
                                  <select 
                                      value={threshold} 
                                      onChange={(e) => { const n = settings.safetySettings.settings.map(s => s.category === category ? { ...s, threshold: e.target.value as HarmBlockThreshold } : s); setSettings(p => ({...p, safetySettings: { ...p.safetySettings, settings: n }})); }}
                                      className="bg-slate-900 border-none text-xs text-rose-300 focus:ring-0 cursor-pointer rounded-lg py-1"
                                  >
                                      {Object.entries(HARM_BLOCK_THRESHOLDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                  </select>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          case 'advanced':
              return (
                  <div className="space-y-8 animate-fade-in-up">
                      {/* Data Management */}
                      <div>
                           <h2 className="text-lg font-bold text-slate-300 mb-4">Dữ Liệu Trình Duyệt</h2>
                           <div className="flex gap-4">
                               <Button onClick={() => { localStorage.clear(); window.location.reload(); }} variant="danger" fullWidth={false} className="!text-xs">Xóa Toàn Bộ Dữ Liệu & Reset App</Button>
                           </div>
                           <p className="text-[10px] text-slate-500 mt-2">Cảnh báo: Hành động này sẽ xóa hết các bản lưu game, lịch sử cài đặt và API Key.</p>
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
      <div className="w-full max-w-4xl glass-panel rounded-[2rem] p-6 md:p-8 relative animate-fade-in-up h-[90vh] flex flex-col shadow-2xl border-white/10">
          
          {/* Header & Tabs */}
          <div className="flex-shrink-0 mb-6">
              <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Thiết Lập Hệ Thống</h1>
                  <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition"><Icon name="xCircle" className="w-8 h-8"/></button>
              </div>

              {/* Horizontal Scrollable Tabs */}
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {tabs.map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`
                                  flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 border
                                  ${isActive 
                                      ? 'bg-fuchsia-600/20 border-fuchsia-500/50 text-white shadow-[0_0_15px_rgba(192,132,252,0.15)]' 
                                      : 'bg-slate-900/40 border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                  }
                              `}
                          >
                              <Icon name={tab.icon} className={`w-4 h-4 ${isActive ? 'text-fuchsia-400' : ''}`} />
                              {tab.label}
                          </button>
                      );
                  })}
              </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pl-1 pb-4">
              {renderContent()}
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 pt-4 border-t border-white/5 flex justify-end gap-3">
              <Button onClick={onBack} variant="ghost" fullWidth={false}>Hủy</Button>
              <Button onClick={handleSave} variant="primary" fullWidth={false} className="!px-8 shadow-lg shadow-fuchsia-500/20">Lưu Cấu Hình</Button>
          </div>
      </div>
    </div>
  );
};

export default SettingsScreen;