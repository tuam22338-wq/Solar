import React, { useState, ReactNode } from 'react';

interface AccordionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  startOpen?: boolean;
  className?: string;
}

const Accordion: React.FC<AccordionProps> = ({ title, icon, children, startOpen = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 ${className} ${isOpen ? 'bg-slate-800/40' : 'bg-transparent hover:bg-white/5'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4"
      >
        <div className="flex items-center gap-3">
          {icon && <span className={`text-slate-400 transition-colors ${isOpen ? 'text-fuchsia-400' : ''}`}>{icon}</span>}
          <h3 className={`text-sm font-bold uppercase tracking-wider transition-colors ${isOpen ? 'text-white' : 'text-slate-400'}`}>{title}</h3>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-slate-500'}`}>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0 border-t border-white/5 text-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;