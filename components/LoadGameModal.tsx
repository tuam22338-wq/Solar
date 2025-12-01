import React, { useState, useEffect } from 'react';
import { SaveSlot, GameState } from '../types';
import * as gameService from '../services/gameService';
import Button from './common/Button';
import Icon from './common/Icon';

interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (gameState: GameState) => void;
}

const LoadGameModal: React.FC<LoadGameModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [saves, setSaves] = useState<SaveSlot[]>([]);

  useEffect(() => { if (isOpen) setSaves(gameService.loadAllSaves()); }, [isOpen]);

  const handleDelete = (saveId: number) => {
    if (confirm('Xóa bản lưu này?')) {
      gameService.deleteSave(saveId);
      setSaves(gameService.loadAllSaves());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="glass-panel p-6 md:p-8 rounded-[2rem] w-full max-w-2xl max-h-[80vh] flex flex-col relative animate-fade-in-up shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <div>
              <h2 className="text-2xl font-black text-white">Dữ Liệu Đã Lưu</h2>
              <p className="text-slate-500 text-sm mt-1">Chọn điểm lưu để tiếp tục hành trình.</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition"><Icon name="xCircle" className="w-6 h-6"/></button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {saves.length > 0 ? saves.map((save) => (
            <div key={save.saveId} className="group glass-input hover:bg-white/5 p-4 rounded-2xl border-white/5 transition-all flex items-center gap-5 cursor-pointer" onClick={() => { onLoad({worldConfig: save.worldConfig, history: save.history}); onClose(); }}>
               <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-600/20 to-purple-600/20 rounded-xl flex items-center justify-center text-fuchsia-400 group-hover:scale-110 transition-transform">
                   <Icon name="save" className="w-6 h-6"/>
               </div>
               <div className="flex-grow min-w-0">
                    <p className="font-bold text-slate-200 truncate group-hover:text-fuchsia-300 transition-colors">{save.previewText}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{new Date(save.saveDate).toLocaleDateString('vi-VN')}</span>
                        <span>•</span>
                        <span>{new Date(save.saveDate).toLocaleTimeString('vi-VN')}</span>
                    </div>
               </div>
               <button onClick={(e) => { e.stopPropagation(); handleDelete(save.saveId); }} className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition opacity-0 group-hover:opacity-100"><Icon name="trash" className="w-5 h-5"/></button>
            </div>
          )) : <div className="text-center py-20 text-slate-600 italic">Không tìm thấy dữ liệu nào.</div>}
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;