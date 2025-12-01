
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameTurn, GameState, TemporaryRule, CharacterConfig, WorldTime, Quest, WeatherType } from '../types';
import * as aiService from '../services/aiService';
import * as gameService from '../services/gameService';
import { WEATHER_TRANSLATIONS } from '../constants';
import Button from './common/Button';
import Icon from './common/Icon';
import TemporaryRulesModal from './TemporaryRulesModal';

// --- Helper to clean AI text ---
const cleanAndFormatContent = (content: string) => {
    // 1. Remove <state> tags content completely
    let cleaned = content.replace(/<state>[\s\S]*?<\/state>/gi, '');
    
    // 2. Remove <thought> tags content completely (per user request to reduce clutter)
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

    // 3. Remove <exp> tags but keep content (optional, or style it)
    // We can keep <exp> for FormattedNarration to handle if we want sound effects, 
    // but for "reading mode" let's keep them styled.

    return cleaned.trim();
};

const FormattedNarration: React.FC<{ content: string }> = React.memo(({ content }) => {
    const cleanedContent = cleanAndFormatContent(content);
    
    // Split by double newlines to create paragraphs
    const paragraphs = cleanedContent.split(/\n\s*\n/).filter(Boolean);

    return (
        <div className="prose prose-invert max-w-none">
            {paragraphs.map((para, index) => {
                // Handle bolding **text**
                const parts = para.split(/(\*\*.*?\*\*|<exp>.*?<\/exp>)/g).filter(Boolean);
                
                return (
                    <p key={index} className="mb-6 text-slate-200 text-lg leading-relaxed font-serif tracking-wide text-justify">
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
  initialGameState: GameState;
  onBack: () => void;
}

const GameplayScreen: React.FC<GameplayScreenProps> = ({ initialGameState, onBack }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(initialGameState.history.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isTempRulesModalOpen, setIsTempRulesModalOpen] = useState(false);
  const [lastStateUpdate, setLastStateUpdate] = useState<any>(null);
  
  // Pagination State
  // Calculate total logical pages. 
  // Page 1 = Intro (Turn 0)
  // Page N = Action (Turn 2N-1) + Narration (Turn 2N)
  const historyPairs = useMemo(() => {
      const pairs: GameTurn[][] = [];
      const h = gameState.history;
      if (h.length === 0) return [];
      
      // First narration is standalone (Page 1)
      if (h[0].type === 'narration') {
          pairs.push([h[0]]);
      }

      // Subsequent turns should be Action + Narration pairs
      for (let i = 1; i < h.length; i++) {
          if (h[i].type === 'action') {
              const pair = [h[i]];
              if (h[i+1] && h[i+1].type === 'narration') {
                  pair.push(h[i+1]);
              }
              pairs.push(pair);
          }
      }
      return pairs;
  }, [gameState.history]);

  const [currentPage, setCurrentPage] = useState<number>(historyPairs.length > 0 ? historyPairs.length - 1 : 0);

  // Auto-advance page when history updates
  useEffect(() => {
      if (historyPairs.length > 0) {
          setCurrentPage(historyPairs.length - 1);
      }
  }, [historyPairs.length]);

  const isInitialLoading = isLoading && gameState.history.length === 0;
  
  // --- Game Logic ---

  const startGame = useCallback(async () => {
    if (gameState.history.length > 0) { setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const startingNarration = await aiService.startGame(gameState.worldConfig);
      const updated = { ...gameState, history: [{ type: 'narration', content: startingNarration } as GameTurn] };
      setGameState(updated);
      gameService.saveGame(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi khởi tạo.'); } 
    finally { setIsLoading(false); }
  }, [gameState]);

  useEffect(() => { startGame(); }, [startGame]);

  const applyStateUpdate = (currentState: GameState, update: any): GameState => {
      const newState = { ...currentState };
      let character = { ...newState.worldConfig.character };
      
      // Update Inventory
      if (update.inventory_add && Array.isArray(update.inventory_add)) {
          character.inventory = [...character.inventory, ...update.inventory_add];
      }
      if (update.inventory_remove && Array.isArray(update.inventory_remove)) {
          character.inventory = character.inventory.filter(item => !update.inventory_remove.includes(item));
      }

      // Update HP
      if (update.hp_change) {
          character.hp = Math.min(character.maxHp, Math.max(0, character.hp + update.hp_change));
      }

      // Update Gold
      if (update.gold_change) {
          character.gold = Math.max(0, character.gold + update.gold_change);
      }

      // Level Up
      if (update.level_up) {
          character.level += 1;
          character.maxHp += 10;
          character.hp = character.maxHp; 
      }

      // Status Effects
      if (update.status_add && Array.isArray(update.status_add)) {
           const newEffects = update.status_add.filter((e: string) => !character.statusEffects.includes(e));
           character.statusEffects = [...character.statusEffects, ...newEffects];
      }
      if (update.status_remove && Array.isArray(update.status_remove)) {
           character.statusEffects = character.statusEffects.filter(e => !update.status_remove.includes(e));
      }

      // TIER 3 UPDATES: TIME SYSTEM (Calendar Logic)
      if (update.time_passed) {
          let minutesToAdd = update.time_passed;
          let current = { ...newState.worldTime };

          current.minute += minutesToAdd;
          
          // Minutes -> Hours
          while (current.minute >= 60) {
              current.minute -= 60;
              current.hour += 1;
          }
          
          // Hours -> Days
          while (current.hour >= 24) {
              current.hour -= 24;
              current.day += 1;
          }

          // Days -> Months (Simplified: 30 days = 1 month)
          while (current.day > 30) {
              current.day -= 30;
              current.month += 1;
          }

          // Months -> Years (12 months = 1 year)
          while (current.month > 12) {
              current.month -= 12;
              current.year += 1;
          }

          newState.worldTime = current;
      }

      // Weather
      if (update.weather_update) {
          newState.weather = update.weather_update as WeatherType;
      }

      // Quests
      if (update.quest_update && Array.isArray(update.quest_update)) {
          update.quest_update.forEach((qUpdate: any) => {
              if (qUpdate.action === 'add') {
                  if (!newState.questLog.find(q => q.id === qUpdate.id)) {
                      newState.questLog.push({
                          id: qUpdate.id,
                          title: qUpdate.title,
                          description: qUpdate.description,
                          status: qUpdate.status || 'active',
                          type: qUpdate.type || 'main'
                      });
                  }
              } else if (qUpdate.action === 'update') {
                  newState.questLog = newState.questLog.map(q => 
                      q.id === qUpdate.id ? { ...q, status: qUpdate.status } : q
                  );
              }
          });
      }
      
      // Player Analysis
      if (update.player_behavior_tag) {
          newState.playerAnalysis = {
              ...newState.playerAnalysis,
              behaviorTags: [...newState.playerAnalysis.behaviorTags, update.player_behavior_tag]
          };
      }

      newState.worldConfig.character = character;
      return newState;
  };

  const handleSendAction = async () => {
    if (!playerInput.trim() || isLoading) return;
    
    const newAction: GameTurn = { type: 'action', content: playerInput.trim() };
    const tempHistory = [...gameState.history, newAction];
    setGameState(prev => ({ ...prev, history: tempHistory }));
    setPlayerInput('');
    
    setIsLoading(true); setError(null);
    try {
      const { narration, newSummary, truncatedHistory, stateUpdate } = await aiService.getNextTurn(gameState.worldConfig, tempHistory, gameState.summary, gameState);
      
      let finalHistory: GameTurn[];

      if (truncatedHistory) {
          finalHistory = [...truncatedHistory, { type: 'narration', content: narration }];
      } else {
          finalHistory = [...tempHistory, { type: 'narration', content: narration }];
      }

      let nextGameState = { ...gameState };
      nextGameState.history = finalHistory;
      if (newSummary) nextGameState.summary = newSummary;

      if (stateUpdate) {
          setLastStateUpdate(stateUpdate);
          nextGameState = applyStateUpdate(nextGameState, stateUpdate);
          setTimeout(() => setLastStateUpdate(null), 5000);
      }

      setGameState(nextGameState);
      gameService.saveGame(nextGameState);

    } catch (e) { 
        setError(e instanceof Error ? e.message : 'Lỗi AI.'); 
    } 
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
      <TemporaryRulesModal isOpen={isTempRulesModalOpen} onClose={() => setIsTempRulesModalOpen(false)} onSave={(r) => {
          const u = { ...gameState, worldConfig: { ...gameState.worldConfig, temporaryRules: r } };
          setGameState(u); gameService.saveGame(u); setIsTempRulesModalOpen(false);
      }} initialRules={gameState.worldConfig.temporaryRules} />
      
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

      {/* Main Layout */}
      <div className="flex h-screen w-full overflow-hidden bg-slate-950 relative">
        
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50 pointer-events-none z-10"></div>

        {/* TOP HUD (Center Floating) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 animate-fade-in-up">
            <div className="glass-strong rounded-full px-5 py-2 flex items-center gap-4 border-white/10 shadow-lg bg-slate-900/60 backdrop-blur-xl">
                 {/* Weather */}
                 <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                     <Icon name={getWeatherIcon(gameState.weather) as any} className="w-5 h-5 text-amber-300 drop-shadow-md" />
                     <span className="text-xs font-bold text-slate-200 hidden sm:inline">{WEATHER_TRANSLATIONS[gameState.weather]}</span>
                 </div>
                 {/* Time */}
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
        </div>

        {/* Left Sidebar (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col w-72 glass-panel border-r border-white/5 p-6 z-20 h-full backdrop-blur-2xl">
            <div className="mb-6 mt-12">
                <h1 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400 truncate">{gameState.worldConfig.storyContext.genre}</h1>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {/* Character Widget */}
                <div className="glass-strong bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <Icon name="user" className="w-3 h-3"/> Nhân Vật
                    </div>
                    <div className="font-bold text-lg text-white mb-1 flex justify-between items-center">
                        <span className="truncate">{gameState.worldConfig.character.name}</span>
                        <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/30">Lv.{gameState.worldConfig.character.level || 1}</span>
                    </div>
                    
                    {/* HP Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-2 mt-2">
                        <div className="bg-red-500 h-full transition-all duration-500" style={{width: `${(gameState.worldConfig.character.hp / gameState.worldConfig.character.maxHp) * 100}%`}}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>HP: {gameState.worldConfig.character.hp}/{gameState.worldConfig.character.maxHp}</span>
                        <span className="text-yellow-500">Gold: {gameState.worldConfig.character.gold}</span>
                    </div>
                </div>

                {/* Quest Log */}
                <div className="glass-strong bg-amber-900/10 p-4 rounded-2xl border border-amber-500/20">
                    <div className="text-xs font-bold text-amber-500 uppercase mb-3 flex items-center gap-2">
                        <Icon name="quest" className="w-3 h-3"/> Nhiệm Vụ
                    </div>
                    {gameState.questLog.length > 0 ? (
                        <ul className="space-y-3">
                            {gameState.questLog.filter(q => q.status === 'active').map((quest) => (
                                <li key={quest.id} className="text-xs text-slate-300 border-l-2 border-amber-500/50 pl-2">
                                    <div className="font-bold text-amber-100">{quest.title}</div>
                                </li>
                            ))}
                             {gameState.questLog.every(q => q.status !== 'active') && <li className="text-[10px] italic text-slate-500">Không có nhiệm vụ active.</li>}
                        </ul>
                    ) : (
                         <div className="text-[10px] italic text-slate-500 text-center">Chưa có nhiệm vụ nào.</div>
                    )}
                </div>

                {/* Inventory */}
                <div className="glass-strong bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <Icon name="database" className="w-3 h-3"/> Hành Trang
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1">
                        {gameState.worldConfig.character.inventory.map((item, i) => <li key={i}>• {item}</li>)}
                        {gameState.worldConfig.character.inventory.length === 0 && <li className="italic text-slate-600">Trống</li>}
                    </ul>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                 <Button onClick={() => gameService.saveGame(gameState)} variant="ghost" className="!p-2 flex-1 border border-white/5 hover:bg-white/5"><Icon name="save" className="w-5 h-5"/></Button>
                 <Button onClick={() => setShowExitConfirm(true)} variant="ghost" className="!p-2 flex-1 border border-white/5 hover:bg-red-500/10 hover:text-red-400"><Icon name="back" className="w-5 h-5"/></Button>
            </div>
        </div>

        {/* Main Reading Area */}
        <div className="flex-1 flex flex-col relative h-full z-10 bg-slate-950/80">
            
            {/* Mobile Header Buttons (Top Right/Left) */}
            <div className="lg:hidden absolute top-4 right-4 z-40 flex gap-2">
                <button onClick={() => setShowExitConfirm(true)} className="p-2 glass-panel rounded-full text-red-400"><Icon name="xCircle" className="w-5 h-5"/></button>
            </div>
            <div className="lg:hidden absolute top-4 left-4 z-40">
                 <button onClick={() => setIsTempRulesModalOpen(true)} className="p-2 glass-panel rounded-full text-slate-400"><Icon name="rules" className="w-5 h-5"/></button>
            </div>

            {/* Pagination / Navigation Bar (Top of Text) */}
            <div className="flex justify-center items-center py-4 mt-16 lg:mt-16 z-30 pointer-events-none">
                 <div className="glass-strong rounded-full px-2 py-1 flex items-center gap-4 pointer-events-auto shadow-lg">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
                        disabled={currentPage === 0}
                        className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
                      >
                          <Icon name="back" className="w-4 h-4 text-slate-300"/>
                      </button>
                      <span className="text-xs font-mono font-bold text-slate-400 w-20 text-center">
                          TRANG {currentPage + 1} / {historyPairs.length || 1}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(historyPairs.length - 1, p + 1))} 
                        disabled={currentPage === historyPairs.length - 1}
                        className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors"
                      >
                          <Icon name="play" className="w-4 h-4 text-slate-300"/>
                      </button>
                 </div>
            </div>

            {/* Content Display (The Book Page) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 pb-32 scroll-smooth custom-scrollbar">
                {isInitialLoading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-t-fuchsia-500 animate-spin mb-4"></div>
                        <p className="text-fuchsia-300 font-serif italic tracking-widest animate-pulse">Đang kiến tạo thế giới...</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto animate-fade-in-up py-4">
                        {currentPair.map((turn, idx) => (
                            <div key={idx} className="mb-8">
                                {turn.type === 'action' ? (
                                    <div className="flex justify-end mb-6">
                                         <div className="glass-panel border-fuchsia-500/30 bg-fuchsia-900/10 rounded-2xl rounded-tr-none px-6 py-4 shadow-lg backdrop-blur-sm max-w-[80%]">
                                             <p className="text-fuchsia-100 font-serif italic text-lg leading-relaxed">"{turn.content}"</p>
                                         </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute -left-6 top-1 text-fuchsia-500/30 font-serif text-4xl leading-none">“</div>
                                        <FormattedNarration content={turn.content} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {isLoading && !isInitialLoading && (
                    <div className="max-w-3xl mx-auto mt-4 flex items-center gap-2 text-fuchsia-400 text-sm font-mono animate-pulse">
                        <Icon name="magic" className="w-4 h-4 animate-spin"/>
                        <span>AI đang viết trang tiếp theo...</span>
                    </div>
                )}
            </div>

            {/* Input Area (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-40">
                <div className="max-w-3xl mx-auto glass-strong rounded-[2rem] p-2 pl-6 flex items-end gap-2 shadow-[0_0_60px_rgba(0,0,0,0.6)] border-t border-white/10 ring-1 ring-white/5 transition-all focus-within:ring-fuchsia-500/50 focus-within:border-fuchsia-500/50 bg-slate-900/80 backdrop-blur-xl">
                    <textarea
                        value={playerInput}
                        onChange={(e) => setPlayerInput(e.target.value)}
                        onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAction(); }}}
                        placeholder="Hành động tiếp theo của bạn..."
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-500 resize-none py-4 max-h-40 min-h-[56px] text-lg font-medium"
                        style={{ height: 'auto', overflow: 'hidden' }}
                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                    />
                    <Button 
                        onClick={handleSendAction} 
                        disabled={isLoading || !playerInput.trim()} 
                        variant="primary" 
                        fullWidth={false}
                        className="!rounded-full !w-12 !h-12 !p-0 mb-1 mr-1 shadow-lg shadow-fuchsia-600/30 bg-fuchsia-600 hover:bg-fuchsia-500 border-none"
                    >
                        {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Icon name="arrowUp" className="w-6 h-6 text-white"/>}
                    </Button>
                </div>
                {error && <p className="text-red-400 text-xs mt-3 text-center opacity-80">{error}</p>}
            </div>
            
            {/* State Update Toast */}
            {lastStateUpdate && (
                <div className="absolute bottom-28 right-6 z-50 animate-fade-in-up">
                    <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/20 shadow-lg max-w-xs">
                        <div className="text-xs font-bold text-emerald-400 uppercase mb-2">Cập nhật Trạng thái</div>
                        <ul className="text-xs text-emerald-100 space-y-1">
                            {lastStateUpdate.hp_change !== undefined && <li>❤️ HP: {lastStateUpdate.hp_change > 0 ? '+' : ''}{lastStateUpdate.hp_change}</li>}
                            {lastStateUpdate.gold_change !== undefined && <li>🪙 Gold: {lastStateUpdate.gold_change > 0 ? '+' : ''}{lastStateUpdate.gold_change}</li>}
                            {lastStateUpdate.inventory_add && lastStateUpdate.inventory_add.map((i:any) => <li key={i}>🎒 + {i}</li>)}
                            {lastStateUpdate.level_up && <li className="text-yellow-300 font-bold">✨ LÊN CẤP!</li>}
                            {lastStateUpdate.time_passed && <li>⏳ +{lastStateUpdate.time_passed} phút</li>}
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
