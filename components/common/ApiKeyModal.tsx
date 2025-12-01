import React, { useState } from 'react';
import Button from './Button';
import Icon from './Icon';
import * as aiService from '../../services/aiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onCancel: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onCancel }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveAndTest = async () => {
    if (!apiKey.trim()) { setError('Vui lòng nhập API Key.'); return; }
    setIsLoading(true); setError(null);
    try {
      if (await aiService.testSingleKey(apiKey)) onSave(apiKey);
      else setError('API Key không hoạt động.');
    } catch (e) { setError('Lỗi kết nối kiểm tra.'); } 
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[150] p-6">
      <div className="glass-panel p-8 rounded-3xl w-full max-w-lg relative animate-fade-in-up border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-500/30">
             <Icon name="key" className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2">Yêu cầu quyền truy cập</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">Để sử dụng trí tuệ nhân tạo Gemini 2.5 Flash, vui lòng cung cấp API Key của bạn.</p>

        <div className="relative mb-6">
            <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full glass-input rounded-xl px-5 py-4 text-center tracking-widest text-lg font-mono placeholder:text-slate-600 focus:border-fuchsia-500/50"
            />
            {error && <div className="absolute -bottom-6 left-0 right-0 text-center text-red-400 text-xs">{error}</div>}
        </div>

        <div className="flex gap-3 mt-8">
          <Button onClick={onCancel} variant="ghost" fullWidth={false} className="flex-1">Để sau</Button>
          <Button onClick={handleSaveAndTest} disabled={isLoading} variant="primary" fullWidth={false} className="flex-1 shadow-fuchsia-500/20">
            {isLoading ? 'Đang xác thực...' : 'Kết nối ngay'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;