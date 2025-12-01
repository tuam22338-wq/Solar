import React, { useState, useEffect } from 'react';
import { TemporaryRule } from '../types';
import Button from './common/Button';
import Icon from './common/Icon';
import ToggleSwitch from './common/ToggleSwitch';

interface TemporaryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: TemporaryRule[]) => void;
  initialRules: TemporaryRule[];
}

const TemporaryRulesModal: React.FC<TemporaryRulesModalProps> = ({ isOpen, onClose, onSave, initialRules }) => {
  const [rules, setRules] = useState<TemporaryRule[]>(initialRules);

  useEffect(() => { if (isOpen) setRules(initialRules); }, [isOpen, initialRules]);
  const handleCloseAndSave = () => { onSave(rules); onClose(); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-6" onClick={handleCloseAndSave}>
      <div className="glass-panel p-6 rounded-[2rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div>
               <h2 className="text-xl font-bold text-white">Quy Tắc Tạm Thời</h2>
               <p className="text-xs text-slate-500">Áp dụng cho bối cảnh/tình huống hiện tại.</p>
          </div>
          <button onClick={handleCloseAndSave} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><Icon name="xCircle" className="w-6 h-6"/></button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {rules.map((rule, index) => (
            <div key={index} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${rule.enabled ? 'bg-slate-800/50 border-white/10' : 'bg-transparent border-transparent opacity-50'}`}>
                <ToggleSwitch enabled={rule.enabled} setEnabled={() => { const n = [...rules]; n[index].enabled = !n[index].enabled; setRules(n); }} />
                <input 
                    type="text"
                    value={rule.text}
                    onChange={(e) => { const n = [...rules]; n[index].text = e.target.value; setRules(n); }}
                    className="flex-grow bg-transparent border-none focus:ring-0 text-sm text-slate-200 placeholder:text-slate-600"
                    placeholder="Nhập nội dung luật..."
                />
                <button onClick={() => setRules(rules.filter((_, i) => i !== index))} className="text-slate-500 hover:text-red-400 p-2"><Icon name="trash" className="w-4 h-4"/></button>
            </div>
          ))}
          <Button onClick={() => setRules([...rules, { text: '', enabled: true }])} variant="secondary" fullWidth className="!text-xs border-dashed !py-2 opacity-60 hover:opacity-100"><Icon name="plus" className="w-4 h-4 mr-2"/> Thêm Luật Mới</Button>
        </div>
        
        <div className="pt-6 mt-4 flex justify-end">
             <Button onClick={handleCloseAndSave} variant="primary" fullWidth={false} className="!px-8 shadow-lg shadow-blue-500/20">Lưu Áp Dụng</Button>
        </div>
      </div>
    </div>
  );
};

export default TemporaryRulesModal;