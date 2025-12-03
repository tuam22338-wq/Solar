

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameTurn, GameState, TemporaryRule, CodexEntry, WeatherType, CustomStat, CombatEntity, MerchantData } from '../types';
import * as aiService from '../services/aiService';
import * as gameService from '../services/gameService';
import { WEATHER_TRANSLATIONS } from '../constants';
import Button from './common/Button';
import Icon from './common/Icon';
import TemporaryRulesModal from './TemporaryRulesModal';
import CodexModal from './CodexModal';
import { useStore } from '../store/useStore';

// --- SUB-COMPONENTS FOR HUD ---

const HUDButton: React.FC<{ icon: any; label?: string; onClick: () => void; active?: boolean }> = ({ icon, label, onClick, active }) => (
    <button 
        onClick={onClick} 
        className={`group relative flex items-center gap-2 p-3 rounded-xl transition-all duration-300 ${active ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5'}`}
    >
        <Icon name={icon} className="w-5 h-5" />
        {label && <span className="text-xs font-bold hidden md:inline">{label}</span>}
    </button>
);

const CharacterModal: React.FC<{ isOpen: boolean; onClose: () => void; gameState: GameState }> = ({ isOpen, onClose, gameState }) => {
    if (!isOpen) return null;
    const { character, progressionSystem } = gameState.worldConfig;
    const currentRank = progressionSystem?.ranks[character.currentRankIndex || 0];
    const nextRank = progressionSystem?.ranks[(character.currentRankIndex || 0) + 1];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" onClick={onClose}>
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl animate-fade-in-up border border-fuchsia-500/20 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10"><Icon name="xCircle" className="w-5 h-5"/></button>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/20">
                        <Icon name="user" className="w-8 h-8"/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">{character.name}</h2>
                        <div className="flex gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {currentRank && <span className="text-fuchsia-400">{currentRank.name}</span>}
                            <span>•</span>
                            <span>{character.gender}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-4 mb-6">
                     {/* HP */}
                     <div>
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                            <span>HP</span>
                            <span>{character.hp}/{character.maxHp}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                            <div className="bg-red-500 h-full transition-all" style={{width: `${(character.hp / character.maxHp) * 100}%`}}></div>
                        </div>
                    </div>

                    {/* Custom Stats */}
                    {character.customStats?.map(stat => (
                         <div key={stat.id}>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                                <span>{stat.name}</span>
                                <span>{stat.value}/{stat.max}</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                                <div className={`h-full transition-all bg-${stat.color}-500`} style={{width: `${(stat.value / stat.max) * 100}%`, backgroundColor: stat.color === 'blue' ? '#3b82f6' : stat.color === 'purple' ? '#a855f7' : stat.color === 'yellow' ? '#eab308' : stat.color === 'red' ? '#ef4444' : stat.color === 'green' ? '#10b981' : '#d946ef' }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Progression System Display */}
                {progressionSystem && progressionSystem.enabled && currentRank && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-900/50 border border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-400 uppercase tracking-widest mb-3">
                            <Icon name="arrowUp" className="w-4 h-4"/> {progressionSystem.name}
                        </div>
                        <div className="mb-3">
                            <div className="text-lg font-bold text-white">{currentRank.name}</div>
                            <div className="text-xs text-slate-400 italic">{currentRank.description}</div>
                        </div>
                        
                        {nextRank ? (
                            <div className="bg-black/30 p-2 rounded-lg">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Điều kiện lên cấp {nextRank.name}</div>
                                {nextRank.requirements.map((req, i) => {
                                    const stat = character.customStats.find(s => s.id === req.statId);
                                    if (!stat) return null;
                                    const isMet = stat.value >= req.value;
                                    return (
                                        <div key={i} className="flex justify-between text-xs">
                                            <span className="text-slate-300">{stat.name} ({stat.value}/{req.value})</span>
                                            {isMet ? <Icon name="checkCircle" className="w-4 h-4 text-emerald-500"/> : <span className="text-slate-600">Chưa đạt</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-xs text-fuchsia-300 font-bold mt-2">Đã đạt cảnh giới tối cao</div>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-xl border border-white/5">
                    <span className="text-sm font-bold text-slate-300">Tài chính</span>
                    <span className="text-amber-400 font-mono font-bold flex items-center gap-2">
                        <Icon name="search" className="w-4 h-4"/> {character.gold} Gold
                    </span>
                </div>
            </div>
        </div>
    );
};

const InventoryModal: React.FC<{ isOpen: boolean; onClose: () => void; gameState: GameState }> = ({ isOpen, onClose, gameState }) => {
    if (!isOpen) return null;
    const { character } = gameState.worldConfig;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" onClick={onClose}>
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl animate-fade-in-up border border-emerald-500/20 relative" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10"><Icon name="xCircle" className="w-5 h-5"/></button>
                 
                 <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                         <Icon name="database" className="w-5 h-5"/>
                     </div>
                     <h2 className="text-xl font-bold text-white">Túi Đồ</h2>
                 </div>

                 <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                     {character.inventory.length > 0 ? (
                         <div className="grid grid-cols-1 gap-2">
                             {character.inventory.map((item, idx) => (
                                 <div key={idx} className="p-3 bg-slate-900/50 rounded-xl border border-white/5 flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                                         <Icon name="tag" className="w-4 h-4"/>
                                     </div>
                                     <span className="text-sm text-slate-200 font-medium">{item}</span>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <div className="text-center py-10 text-slate-500 italic">Túi đồ trống rỗng.</div>
                     )}
                 </div>
            </div>
        </div>
    );
};

const cleanAndFormatContent = (content: string) => {
    let cleaned = content.replace(/<state>[\s\S]*?<\/state>/gi, '');
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    return cleaned.trim();
};

const getTextSizeClass = (size: 'small' | 'medium' | 'large' = 'medium') => {
    switch(size) {
        case 'small': return 'text-sm md:text-base leading-relaxed'; 
        case 'large': return 'text-xl md:text-2xl leading-loose'; 
        case 'medium': 
        default: return 'text-base md:text-lg leading-relaxed';
    }
};

const FormattedNarration: React.FC<{ content: string; textSize?: 'small' | 'medium' | 'large' }> = React.memo(({ content, textSize }) => {
    const cleanedContent = cleanAndFormatContent(content);
    const paragraphs = cleanedContent.split(/\n\s*\n/).filter(Boolean);
    const sizeClass = getTextSizeClass(textSize);

    return (
        <div className="prose prose-invert max-w-none">
            {paragraphs.map((para, index) => {
                const parts = para.split(/(\*\*.*?\*\*|<exp>.*?<\/exp>)/g).filter(Boolean);
                return (
                    <p key={index} className={`mb-6 text-slate-200 font-serif tracking-wide text-justify ${sizeClass}`}>
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="text-fuchsia-200 font-bold">{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('<exp>') && part.endsWith('</exp>')) {
                                return <span key={i} className="text-fuchsia-400 font-bold italic font-sans text-base mx-1 uppercase tracking-widest">{part.slice(5, -6)}</span>;
                            }
                            return <span key={i}>{part}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
});

interface GameplayScreenProps {
  onBack: () => void;
}

const GameplayScreen: React.FC<GameplayScreenProps> = ({ onBack }) => {
  const { gameState, setGameState, appSettings, applyGameStateUpdate } = useStore();
  
  const textSize = appSettings.uiSettings.textSize;

  if (!gameState) return null;

  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(gameState.history.length === 0);
  const [error, setError] = useState<string | null>(null);
  
  // Modals State
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isTempRulesModalOpen, setIsTempRulesModalOpen] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  
  const [lastStateUpdate, setLastStateUpdate] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  
  const historyPairs = useMemo(() => {
      const pairs: GameTurn[][] = [];
      const h = gameState.history;
      if (h.length === 0) return [];
      if (h[0].type === 'narration') pairs.push([h[0]]);
      for (let i = 1; i < h.length; i++) {
          if (h[i].type === 'action') {
              const pair = [h[i]];
              if (h[i+1] && h[i+1].type === 'narration') pair.push(h[i+1]);
              pairs.push(pair);
          }
      }
      return pairs;
  }, [gameState.history]);

  const [currentPage, setCurrentPage] = useState<number>(historyPairs.length > 0 ? historyPairs.length - 1 : 0);
  useEffect(() => { if (historyPairs.length > 0) setCurrentPage(historyPairs.length - 1); }, [historyPairs.length]);

  const isInitialLoading = isLoading && gameState.history.length === 0;
  
  const startGame = useCallback(async () => {
    if (gameState.history.length > 0) { setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const startingNarration = await aiService.startGame(gameState.worldConfig);
      // Try to parse suggestions from initial load too
      const stateMatch = startingNarration.match(/<state>([\s\S]*?)<\/state>/);
      let suggestions: string[] = [];
      let content = startingNarration;

      if (stateMatch) {
          try {
             // We reuse the parsing logic implicitly, but let's do a quick extract here if needed or let getNextTurn handle it.
             // But start game is direct.
             const json = JSON.parse(stateMatch[1]);
             if (json.suggestions) suggestions = json.suggestions;
             content = startingNarration.replace(/<state>[\s\S]*?<\/state>/, '').trim();
          } catch(e) {}
      }
      
      const updated = { ...gameState, history: [{ type: 'narration', content: content } as GameTurn] };
      setGameState(updated);
      gameService.saveGame(updated);
      if (suggestions.length > 0) { setAiSuggestions(suggestions); setIsSuggestionsOpen(true); }

    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi khởi tạo.'); } 
    finally { setIsLoading(false); }
  }, [gameState, setGameState]);

  useEffect(() => { startGame(); }, [startGame]);
  
  const handleExpandCodexEntry = async (entry: CodexEntry) => {
      const expanded = await aiService.expandCodexEntry(gameState.worldConfig, entry);
      applyGameStateUpdate({ codex_update: [{ id: entry.id, ...expanded }] });
  };

  const handleSendAction = async (input?: string) => {
    const textToSend = input || playerInput;
    if (!textToSend.trim() || isLoading) return;
    
    const newAction: GameTurn = { type: 'action', content: textToSend.trim() };
    const tempHistory = [...gameState.history, newAction];
    
    // Optimistic Update
    setGameState({ ...gameState, history: tempHistory });
    setPlayerInput('');
    setIsLoading(true); setError(null);
    setAiSuggestions([]); // Clear old suggestions
    setIsSuggestionsOpen(false);
    
    try {
      const { narration, newSummary, truncatedHistory, stateUpdate } = await aiService.getNextTurn(gameState.worldConfig, tempHistory, gameState.summary, gameState);
      let finalHistory: GameTurn[];
      if (truncatedHistory) {
          finalHistory = [...truncatedHistory, { type: 'narration', content: narration }];
      } else {
          finalHistory = [...tempHistory, { type: 'narration', content: narration }];
      }
      
      let nextGameState = { ...gameState, history: finalHistory };
      if (newSummary) nextGameState.summary = newSummary;
      
      setGameState(nextGameState); // Set state first
      
      if (stateUpdate) {
          setLastStateUpdate(stateUpdate);
          applyGameStateUpdate(stateUpdate); // Use Store Action to handle updates
          setTimeout(() => setLastStateUpdate(null), 5000);
          
          if (stateUpdate.suggestions && Array.isArray(stateUpdate.suggestions)) {
              setAiSuggestions(stateUpdate.suggestions);
              setIsSuggestionsOpen(true);
          }
      } else {
          gameService.saveGame(nextGameState); // Save if no state update triggered auto-save
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi AI.'); } 
    finally { setIsLoading(false); }
  };
  
  const getWeatherIcon = (w: WeatherType) => {
      switch(w) {
          case 'Sunny': return 'sun';
          case 'Rainy': return 'rain';
          case 'Stormy': return 'storm';
          case 'Cloudy': return 'cloud';
          case 'Snowy': return 'snow';
          case 'Foggy': return 'fog';
          default: return 'sun';
      }
  };
  
  const currentPair = historyPairs[currentPage] || [];
  
  return (
    <>
      {/* Modals */}
      <CharacterModal isOpen={isCharacterModalOpen} onClose={() => setIsCharacterModalOpen(false)} gameState={gameState} />
      <InventoryModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} gameState={gameState} />
      <TemporaryRulesModal isOpen={isTempRulesModalOpen} onClose={() => setIsTempRulesModalOpen(false)} onSave={(r) => {
          const u = { ...gameState, worldConfig: { ...gameState.worldConfig, temporaryRules: r } };
          setGameState(u); gameService.saveGame(u); setIsTempRulesModalOpen(false);
      }} initialRules={gameState.worldConfig.temporaryRules} />
      
      <CodexModal isOpen={isCodexOpen} onClose={() => setIsCodexOpen(false)} entries={gameState.codex || []} onExpandEntry={handleExpandCodexEntry}/>

      {showExitConfirm && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="glass-panel p-6 rounded-3xl max-w-sm w-full border-red-500/20 shadow-2xl">
                <h2 className="text-xl font-bold mb-2 text-white">Rời khỏi thế giới?</h2>
                <p className="text-slate-400 mb-6 text-sm">Tiến trình sẽ được lưu tự động.</p>
                <div className="flex gap-3">
                    <Button onClick={() => { gameService.saveGame(gameState); onBack(); }} variant="primary" className="flex-1">Lưu & Thoát</Button>
                    <Button onClick={() => setShowExitConfirm(false)} variant="ghost" className="flex-1">Hủy</Button>
                </div>
            </div>
        </div>
      )}

      <div className="flex h-full w-full overflow-hidden bg-slate-950 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50 pointer-events-none z-10"></div>

        {/* TOP HUD BAR */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
            {/* Left: Genre Title */}
            <div className="pointer-events-auto glass-panel px-4 py-2 rounded-xl border border-white/5 bg-slate-900/80 backdrop-blur-md shadow-lg hidden md:block">
                <h1 className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400 uppercase tracking-widest">{gameState.worldConfig.storyContext.genre}</h1>
            </div>

            {/* Center: Weather & Time Pill (Existing) */}
            <div className="glass-strong rounded-full px-5 py-2 flex items-center gap-4 border-white/10 shadow-lg bg-slate-900/80 backdrop-blur-xl pointer-events-auto">
                 <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                     <Icon name={getWeatherIcon(gameState.weather) as any} className="w-5 h-5 text-amber-300 drop-shadow-md" />
                     <span className="text-xs font-bold text-slate-200 hidden sm:inline">{WEATHER_TRANSLATIONS[gameState.weather]}</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                     <span className="text-fuchsia-300 font-bold">
                        {gameState.worldTime.hour.toString().padStart(2, '0')}:{gameState.worldTime.minute.toString().padStart(2, '0')}
                     </span>
                     <span className="opacity-50">|</span>
                     <span>
                        {gameState.worldTime.day.toString().padStart(2, '0')}/{gameState.worldTime.month.toString().padStart(2, '0')}/N{gameState.worldTime.year}
                     </span>
                 </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex gap-2 pointer-events-auto">
                <HUDButton icon="user" onClick={() => setIsCharacterModalOpen(true)} />
                <HUDButton icon="database" onClick={() => setIsInventoryModalOpen(true)} />
                <HUDButton icon="book" onClick={() => setIsCodexOpen(true)} />
                <HUDButton icon="rules" onClick={() => setIsTempRulesModalOpen(true)} />
                <HUDButton icon="back" onClick={() => setShowExitConfirm(true)} />
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col relative h-full z-10 bg-slate-950/80 w-full">
            
            {/* Pagination */}
            <div className="flex justify-center items-center py-4 mt-20 z-30 pointer-events-none">
                 <div className="glass-strong rounded-full px-2 py-1 flex items-center gap-4 pointer-events-auto shadow-lg">
                      <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30"><Icon name="back" className="w-4 h-4 text-slate-300"/></button>
                      <span className="text-xs font-mono font-bold text-slate-400 w-20 text-center">TRANG {currentPage + 1} / {historyPairs.length || 1}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(historyPairs.length - 1, p + 1))} disabled={currentPage === historyPairs.length - 1} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30"><Icon name="play" className="w-4 h-4 text-slate-300"/></button>
                 </div>
            </div>

            {/* TEXT AREA with CONTEXTUAL OVERLAYS */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 pt-4 pb-48 scroll-smooth custom-scrollbar w-full max-w-5xl mx-auto">
                
                {/* COMBAT OVERLAY */}
                {gameState.interfaceMode === 'combat' && gameState.activeEnemies.length > 0 && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-900/10 border border-red-500/20 animate-fade-in-up">
                        <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Icon name="shieldCheck" className="w-4 h-4"/> COMBAT MODE
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {gameState.activeEnemies.map((enemy) => (
                                <div key={enemy.id} className="glass-panel bg-slate-900/80 p-4 rounded-xl border-white/5 relative overflow-hidden">
                                     <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-white">{enemy.name}</span>
                                            <span className="text-xs text-red-300 font-mono">{enemy.hp}/{enemy.maxHp} HP</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                                            <div className="bg-red-500 h-full transition-all duration-300" style={{width: `${(enemy.hp/enemy.maxHp)*100}%`}}></div>
                                        </div>
                                        {enemy.description && <p className="text-xs text-slate-400 italic">{enemy.description}</p>}
                                     </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MERCHANT OVERLAY */}
                {gameState.interfaceMode === 'exchange' && gameState.activeMerchant && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-900/10 border border-emerald-500/20 animate-fade-in-up">
                        <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Icon name="database" className="w-4 h-4"/> MERCHANT: {gameState.activeMerchant.name}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {gameState.activeMerchant.inventory.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-3 glass-panel bg-slate-900/60 rounded-xl border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Icon name="tag" className="w-4 h-4"/></div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-200">{item.name}</div>
                                            <div className="text-xs text-yellow-500">{item.cost} Gold</div>
                                        </div>
                                    </div>
                                    <Button onClick={() => setPlayerInput(`Mua ${item.name}`)} variant="secondary" fullWidth={false} className="!py-1 !px-3 !text-xs">Mua</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isInitialLoading ? (
                    <div className="h-full flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="w-16 h-16 rounded-full border-2 border-t-fuchsia-500 animate-spin mb-4"></div>
                        <p className="text-fuchsia-300 font-serif italic tracking-widest animate-pulse">Đang kiến tạo thế giới...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        {currentPair.map((turn, idx) => (
                            <div key={idx} className="mb-8">
                                {turn.type === 'action' ? (
                                    <div className="flex justify-end mb-6">
                                         <div className="glass-panel border-fuchsia-500/30 bg-fuchsia-900/10 rounded-2xl rounded-tr-none px-6 py-4 shadow-lg backdrop-blur-sm max-w-[90%] md:max-w-[80%]">
                                             <p className="text-fuchsia-100 font-serif italic text-lg leading-relaxed">"{turn.content}"</p>
                                         </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute -left-4 md:-left-8 top-1 text-fuchsia-500/30 font-serif text-4xl leading-none">“</div>
                                        <FormattedNarration content={turn.content} textSize={textSize} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {isLoading && !isInitialLoading && (
                    <div className="mt-4 flex items-center gap-2 text-fuchsia-400 text-sm font-mono animate-pulse">
                        <Icon name="magic" className="w-4 h-4 animate-spin"/>
                        <span>AI đang viết trang tiếp theo...</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40">
                {/* SUGGESTIONS BAR (NEW) */}
                {aiSuggestions.length > 0 && !isLoading && (
                    <div className="max-w-5xl mx-auto mb-2 flex flex-col items-end">
                         <button 
                            onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)} 
                            className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-2 text-xs font-bold text-fuchsia-400 mb-2 hover:bg-white/10 transition-colors shadow-lg"
                         >
                             <Icon name="magic" className="w-3 h-3"/>
                             <span>Gợi ý {isSuggestionsOpen ? '▼' : '▲'}</span>
                         </button>
                         {isSuggestionsOpen && (
                             <div className="flex gap-2 overflow-x-auto custom-scrollbar w-full pb-2 animate-fade-in-up">
                                 {aiSuggestions.map((suggestion, idx) => (
                                     <button
                                         key={idx}
                                         onClick={() => handleSendAction(suggestion)}
                                         className="flex-shrink-0 bg-slate-900/60 backdrop-blur-sm border border-fuchsia-500/20 hover:border-fuchsia-500/50 hover:bg-fuchsia-900/20 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs md:text-sm transition-all shadow-md whitespace-nowrap"
                                     >
                                         {suggestion}
                                     </button>
                                 ))}
                             </div>
                         )}
                    </div>
                )}

                <div className="max-w-5xl mx-auto glass-strong rounded-[2rem] p-2 pl-4 md:pl-6 flex items-end gap-2 shadow-[0_0_60px_rgba(0,0,0,0.6)] border-t border-white/10 ring-1 ring-white/5 transition-all focus-within:ring-fuchsia-500/50 focus-within:border-fuchsia-500/50 bg-slate-900/90 backdrop-blur-xl">
                    <textarea
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAction(); }}}
                        placeholder="Hành động tiếp theo của bạn..."
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-500 resize-none py-4 max-h-40 min-h-[56px] text-base md:text-lg font-medium"
                        style={{ height: 'auto', overflow: 'hidden' }}
                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                    />
                    <Button 
                        onClick={() => handleSendAction()} 
                        disabled={isLoading || !playerInput.trim()} 
                        variant="primary" 
                        fullWidth={false}
                        className="!rounded-full !w-12 !h-12 !p-0 mb-1 mr-1 shadow-lg shadow-fuchsia-600/30 bg-fuchsia-600 hover:bg-fuchsia-500 border-none flex-shrink-0"
                    >
                        {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Icon name="arrowUp" className="w-6 h-6 text-white"/>}
                    </Button>
                </div>
                {error && <p className="text-red-400 text-xs mt-3 text-center opacity-80">{error}</p>}
            </div>
            
            {/* Notifications */}
            {lastStateUpdate && (
                <div className="absolute bottom-32 right-4 md:right-8 z-50 animate-fade-in-up">
                    <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/20 shadow-lg max-w-xs backdrop-blur-md">
                        <div className="text-xs font-bold text-emerald-400 uppercase mb-2">Cập nhật Trạng thái</div>
                        <ul className="text-xs text-emerald-100 space-y-1">
                            {lastStateUpdate.hp_change !== undefined && <li>❤️ HP: {lastStateUpdate.hp_change > 0 ? '+' : ''}{lastStateUpdate.hp_change}</li>}
                            {lastStateUpdate.gold_change !== undefined && <li>🪙 Gold: {lastStateUpdate.gold_change > 0 ? '+' : ''}{lastStateUpdate.gold_change}</li>}
                            {lastStateUpdate.custom_stats_update && Array.isArray(lastStateUpdate.custom_stats_update) && lastStateUpdate.custom_stats_update.map((s: any) => <li key={s.id}>✨ {s.id}: {s.value > 0 ? '+' : ''}{s.value}</li>)}
                            {lastStateUpdate.ui_mode && <li>🔄 Mode: {lastStateUpdate.ui_mode.toUpperCase()}</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
      </div>
    </>
  );
};

export default GameplayScreen;