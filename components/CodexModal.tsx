

import React, { useState } from 'react';
import { CodexEntry, WorldConfig } from '../types';
import Icon from './common/Icon';
import Button from './common/Button';

interface CodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CodexEntry[];
  onExpandEntry?: (entry: CodexEntry) => Promise<void>; // Handler passed from parent
}

const CodexModal: React.FC<CodexModalProps> = ({ isOpen, onClose, entries, onExpandEntry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);

  if (!isOpen) return null;

  const types = ['All', ...Array.from(new Set(entries.map(e => e.type)))];

  const filteredEntries = entries.filter(entry => {
      const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            entry.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedType === 'All' || entry.type === selectedType;
      return matchesSearch && matchesType;
  });
  
  const handleExpand = async () => {
      if (!selectedEntry || !onExpandEntry) return;
      setIsExpanding(true);
      try {
          await onExpandEntry(selectedEntry);
          // Note: The parent component will update the state, which triggers a re-render.
          // We might need to re-select the entry if the ID changes (unlikely) or just rely on the updated list.
      } catch (e) {
          alert("Lỗi AI: " + (e instanceof Error ? e.message : String(e)));
      } finally {
          setIsExpanding(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 md:p-8" onClick={onClose}>
      <div className="glass-panel w-full max-w-5xl h-[90vh] flex rounded-[2rem] overflow-hidden shadow-2xl border-indigo-500/20 relative" onClick={e => e.stopPropagation()}>
         
         {/* Close Button */}
         <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-900/50 hover:bg-white/10 rounded-full z-20 text-slate-400">
             <Icon name="xCircle" className="w-6 h-6"/>
         </button>

         {/* Left Panel: List & Filters */}
         <div className="w-1/3 min-w-[300px] border-r border-white/5 flex flex-col bg-slate-900/30">
             <div className="p-6 border-b border-white/5">
                 <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-fuchsia-300 mb-1 flex items-center gap-2">
                     <Icon name="book" className="w-6 h-6 text-indigo-400"/>
                     CODEX
                 </h2>
                 <p className="text-xs text-slate-500 mb-4">Hồ sơ dữ liệu Thế giới & Nhân vật.</p>
                 
                 {/* Search */}
                 <div className="relative mb-3">
                     <Icon name="search" className="absolute left-3 top-3 w-4 h-4 text-slate-500"/>
                     <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-sm bg-slate-950/50 focus:ring-indigo-500/50"
                     />
                 </div>

                 {/* Filters */}
                 <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                     {types.map(t => (
                         <button 
                            key={t}
                            onClick={() => setSelectedType(t)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${selectedType === t ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                         >
                             {t}
                         </button>
                     ))}
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                 {filteredEntries.map(entry => (
                     <div 
                        key={entry.id}
                        onClick={() => { setSelectedEntry(entry); }}
                        className={`p-3 rounded-xl cursor-pointer border transition-all hover:bg-white/5 group ${selectedEntry?.id === entry.id ? 'bg-indigo-500/10 border-indigo-500/40' : 'border-transparent bg-transparent'}`}
                     >
                         <div className="flex justify-between items-start mb-1">
                             <span className={`font-bold text-sm ${selectedEntry?.id === entry.id ? 'text-indigo-300' : 'text-slate-200 group-hover:text-white'}`}>{entry.name}</span>
                             <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{entry.type}</span>
                         </div>
                         <div className="flex flex-wrap gap-1">
                             {entry.tags.slice(0, 3).map(tag => (
                                 <span key={tag} className="text-[9px] text-slate-500">#{tag}</span>
                             ))}
                         </div>
                     </div>
                 ))}
                 {filteredEntries.length === 0 && (
                     <div className="text-center py-10 text-slate-600 italic text-xs">Không tìm thấy dữ liệu.</div>
                 )}
             </div>
         </div>

         {/* Right Panel: Detail View */}
         <div className="flex-1 flex flex-col relative bg-slate-950/20">
             {selectedEntry ? (
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-8 animate-fade-in-up">
                     {/* Header */}
                     <div className="mb-6 pb-6 border-b border-white/5">
                         <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                                {selectedEntry.type}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">ID: {selectedEntry.id}</span>
                         </div>
                         <div className="flex items-start justify-between">
                             <h1 className="text-4xl font-black text-white mb-4">{selectedEntry.name}</h1>
                             {onExpandEntry && (
                                 <Button 
                                    onClick={handleExpand} 
                                    disabled={isExpanding}
                                    variant="secondary" 
                                    fullWidth={false} 
                                    className="!py-1.5 !px-3 !text-xs !bg-fuchsia-600/20 !border-fuchsia-500/30 text-fuchsia-300 hover:!bg-fuchsia-600/40"
                                 >
                                     {isExpanding ? 'Đang viết...' : 'AI Expand'}
                                     <Icon name="magic" className="w-3 h-3 ml-1"/>
                                 </Button>
                             )}
                         </div>
                         
                         {/* Tags */}
                         <div className="flex flex-wrap gap-2">
                             {selectedEntry.tags.map(tag => (
                                 <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800 border border-white/5 text-xs text-slate-300">
                                     <Icon name="tag" className="w-3 h-3 text-fuchsia-400"/>
                                     {tag}
                                 </span>
                             ))}
                         </div>
                     </div>

                     {/* Relations Graph (Simple View) */}
                     {selectedEntry.relations && selectedEntry.relations.length > 0 && (
                         <div className="mb-6 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                             <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                 <Icon name="companions" className="w-3 h-3"/> Mạng Lưới Quan Hệ
                             </div>
                             <div className="flex flex-wrap gap-3">
                                 {selectedEntry.relations.map((rel, idx) => (
                                     <div key={idx} className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-white/5 text-xs">
                                         <span className="text-slate-300 font-bold">{rel.targetName}</span>
                                         <span className="text-slate-600">→</span>
                                         <span className="text-fuchsia-400">{rel.type}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}

                     {/* Description */}
                     <div className="prose prose-invert max-w-none">
                         <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap font-serif">
                             {selectedEntry.description}
                         </p>
                     </div>

                     {/* Metadata */}
                     <div className="mt-12 pt-6 border-t border-white/5 text-xs text-slate-600 font-mono">
                         Last Updated: {new Date(selectedEntry.lastUpdated).toLocaleString('vi-VN')}
                     </div>
                 </div>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                     <Icon name="book" className="w-20 h-20 opacity-20 mb-4"/>
                     <p className="text-sm">Chọn một mục để xem chi tiết.</p>
                 </div>
             )}
         </div>

      </div>
    </div>
  );
};

export default CodexModal;
