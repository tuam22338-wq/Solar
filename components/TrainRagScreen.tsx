
import React, { useState, useRef, useEffect } from 'react';
import Icon from './common/Icon';
import Button from './common/Button';
import { KnowledgeBase } from '../types';

interface TrainRagScreenProps {
  onBack: () => void;
}

type ProcessingStep = 'idle' | 'reading' | 'cleaning' | 'chunking' | 'optimizing' | 'complete';

const TrainRagScreen: React.FC<TrainRagScreenProps> = ({ onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [resultFile, setResultFile] = useState<KnowledgeBase | null>(null);

  // Configuration States
  const [chunkSize, setChunkSize] = useState<number>(1000);
  const [chunkOverlap, setChunkOverlap] = useState<number>(100);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  // Auto-scroll terminal
  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const simulateProgress = async (duration: number, start: number, end: number) => {
    const steps = 10;
    const interval = duration / steps;
    const increment = (end - start) / steps;
    for (let i = 0; i <= steps; i++) {
        await new Promise(r => setTimeout(r, interval));
        setProgress(Math.min(end, start + (increment * i)));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset
    setStep('reading');
    setProgress(0);
    setLog([]);
    setResultFile(null);

    const timestamp = new Date().toLocaleTimeString('vi-VN');
    addLog(`[${timestamp}] KHỞI TẠO TIẾN TRÌNH...`);
    addLog(`[${timestamp}] CẤU HÌNH: Size=${chunkSize}, Overlap=${chunkOverlap}`);
    addLog(`[${timestamp}] ĐỌC FILE: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    // 1. Reading
    await simulateProgress(600, 0, 20);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        if (!text) {
            setStep('idle');
            addLog(`[ERROR] File rỗng hoặc không đọc được.`);
            return;
        }
        
        // 2. Cleaning
        setStep('cleaning');
        addLog(`[SYSTEM] Đang chuẩn hóa văn bản (Normalization)...`);
        await simulateProgress(800, 20, 45);
        const cleanText = text.replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();

        // 3. Chunking
        setStep('chunking');
        addLog(`[SYSTEM] Đang cắt nhỏ dữ liệu (Vector Chunking)...`);
        await simulateProgress(1200, 45, 80);
        
        // --- CHUNKING LOGIC WITH OVERLAP ---
        // Simplified Logic: Split by double newline (paragraphs), then merge based on size
        const rawParagraphs = cleanText.split('\n\n');
        const chunks: string[] = [];
        let currentChunk = "";
        
        for (let i = 0; i < rawParagraphs.length; i++) {
            const p = rawParagraphs[i];
            
            // If adding this paragraph exceeds chunk size
            if ((currentChunk.length + p.length) > chunkSize) {
                // Push current chunk
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                
                // Handle Overlap: Keep the end of the previous chunk
                // (Very simplified overlap logic for text based simulation)
                const overlapText = currentChunk.slice(-chunkOverlap); 
                currentChunk = overlapText + "\n\n" + p + "\n\n";
            } else {
                currentChunk += p + "\n\n";
            }
        }
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        // -----------------------------------

        addLog(`[SUCCESS] Đã tạo ra ${chunks.length} phân đoạn dữ liệu (vectors).`);

        // 4. Optimizing
        setStep('optimizing');
        addLog(`[SYSTEM] Đóng gói JSON và tối ưu hóa metadata...`);
        await simulateProgress(600, 80, 100);

        const knowledgeBase: KnowledgeBase = {
            name: file.name.replace('.txt', ''),
            createdDate: new Date().toISOString(),
            chunks: chunks
        };

        setResultFile(knowledgeBase);
        setStep('complete');
        addLog(`[DONE] Hoàn tất! Sẵn sàng xuất file Knowledge Base.`);
    };
    
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const handleDownload = () => {
      if (!resultFile) return;
      const dataStr = JSON.stringify(resultFile, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `${resultFile.name}_knowledge.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
      <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in-up">
          
          {/* Header */}
          <div className="flex justify-between items-center glass-panel p-6 rounded-3xl">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/10">
                      <Icon name="cpu" className="w-6 h-6"/>
                  </div>
                  <div>
                      <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">Train RAG System</h1>
                      <p className="text-slate-400 text-xs">Vector hóa dữ liệu thô cho AI.</p>
                  </div>
              </div>
              <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition"><Icon name="xCircle" className="w-8 h-8"/></button>
          </div>

          {/* MAIN SECTION: SYSTEM TERMINAL (Moved Up & Enhanced) */}
          <div className="glass-panel p-1 rounded-3xl border-rose-500/20 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-8 bg-black/60 flex items-center px-4 gap-2 border-b border-white/5 z-10">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    <div className="ml-auto text-[10px] font-mono text-slate-500">v2.5.0-release</div>
                </div>
                
                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[5] pointer-events-none bg-[length:100%_4px,3px_100%] opacity-20"></div>

                <div 
                    ref={logContainerRef}
                    className="h-80 bg-slate-950 p-6 pt-12 font-mono text-xs md:text-sm overflow-y-auto custom-scrollbar relative shadow-inner"
                >
                    {log.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-rose-900/40 select-none">
                            <Icon name="database" className="w-16 h-16 mb-4 opacity-20"/>
                            <p>SYSTEM READY. WAITING FOR INPUT...</p>
                        </div>
                    )}
                    
                    {log.map((l, i) => (
                        <div key={i} className="mb-1 break-words">
                            <span className="text-rose-500 mr-2 opacity-70">➜</span>
                            <span className={`
                                ${l.includes('[ERROR]') ? 'text-red-400' : ''}
                                ${l.includes('[SUCCESS]') ? 'text-emerald-400' : ''}
                                ${l.includes('[DONE]') ? 'text-emerald-300 font-bold' : ''}
                                ${!l.includes('[') ? 'text-slate-300' : 'text-slate-200'}
                            `}>{l}</span>
                        </div>
                    ))}
                    {step !== 'idle' && step !== 'complete' && (
                        <div className="animate-pulse text-rose-500 mt-2">_ Processing stream...</div>
                    )}
                </div>
          </div>

          {/* BOTTOM SECTION: CONTROLS & UPLOAD (Compact) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Settings Panel */}
              <div className="md:col-span-2 glass-panel p-6 rounded-3xl border-white/5 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Icon name="settings" className="w-4 h-4"/> Cấu Hình Chunking
                  </div>
                  
                  <div className="space-y-6">
                      {/* Chunk Size */}
                      <div>
                          <div className="flex justify-between mb-2">
                              <label className="text-sm font-bold text-slate-200">Chunk Size (Tokens/Chars)</label>
                              <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-rose-300">{chunkSize}</span>
                          </div>
                          <input 
                              type="range" min="100" max="3000" step="50"
                              value={chunkSize}
                              onChange={(e) => setChunkSize(Number(e.target.value))}
                              disabled={step !== 'idle' && step !== 'complete'}
                              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Độ dài tối đa của mỗi đoạn văn bản được cắt.</p>
                      </div>

                      {/* Chunk Overlap */}
                      <div>
                          <div className="flex justify-between mb-2">
                              <label className="text-sm font-bold text-slate-200">Chunk Overlap</label>
                              <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-rose-300">{chunkOverlap}</span>
                          </div>
                          <input 
                              type="range" min="0" max="500" step="10"
                              value={chunkOverlap}
                              onChange={(e) => setChunkOverlap(Number(e.target.value))}
                              disabled={step !== 'idle' && step !== 'complete'}
                              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Độ dài ký tự giữ lại từ đoạn trước để giữ ngữ cảnh.</p>
                      </div>
                  </div>
              </div>

              {/* Upload Panel */}
              <div className="glass-panel p-6 rounded-3xl border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                  {step === 'idle' || step === 'complete' ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {step === 'complete' ? (
                            <div className="text-center z-10 w-full">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Icon name="checkCircle" className="w-6 h-6 text-emerald-400"/>
                                </div>
                                <h3 className="text-white font-bold mb-2">Hoàn tất!</h3>
                                <Button onClick={handleDownload} variant="primary" fullWidth className="!py-2 !text-xs !bg-emerald-600 hover:!bg-emerald-500 shadow-lg shadow-emerald-500/20">
                                    <Icon name="download" className="w-3 h-3 mr-2"/> Tải JSON
                                </Button>
                                <button onClick={() => setStep('idle')} className="mt-3 text-[10px] text-slate-500 hover:text-white underline">Làm lại</button>
                            </div>
                        ) : (
                            <div className="text-center z-10">
                                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-inner">
                                    <Icon name="upload" className="w-6 h-6 text-slate-400 group-hover:text-rose-400"/>
                                </div>
                                <h3 className="text-white font-bold text-sm mb-1">Tải tài liệu (.txt)</h3>
                                <p className="text-[10px] text-slate-500 mb-0">Hỗ trợ file Text thuần.</p>
                                <input 
                                    type="file" 
                                    accept=".txt" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="w-full text-center z-10">
                          <div className="text-2xl font-black text-rose-400 mb-1">{Math.round(progress)}%</div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">{step}...</div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default TrainRagScreen;
