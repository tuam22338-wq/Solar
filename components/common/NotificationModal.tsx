import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  messages: string[];
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, title, messages }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="glass-panel p-8 rounded-3xl w-full max-w-sm shadow-[0_0_40px_rgba(0,0,0,0.5)] relative text-center border-white/10" onClick={(e) => e.stopPropagation()}>
         <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-400 ring-4 ring-amber-500/5">
            <Icon name="info" className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-3 text-white">{title}</h2>
        <div className="text-sm text-slate-400 space-y-2 mb-8 leading-relaxed">
            {messages.map((msg, i) => <p key={i}>{msg}</p>)}
        </div>
        <Button onClick={onClose} variant="secondary" className="!w-full">Đóng</Button>
      </div>
    </div>
  );
};

export default NotificationModal;