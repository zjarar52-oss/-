import React from 'react';
import { LogEntry } from '../types';
import { Terminal, ShieldAlert, Sparkles, CircleCheck, Info, Trash2 } from 'lucide-react';

interface LogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export default function Logs({ logs, onClearLogs }: LogsProps) {
  const getLogStyles = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50/70 border-green-100',
          text: 'text-green-800',
          dot: 'bg-green-500',
          icon: <CircleCheck className="w-4 h-4 text-green-600 shrink-0" />
        };
      case 'error':
        return {
          bg: 'bg-rose-50/70 border-rose-100',
          text: 'text-rose-800',
          dot: 'bg-rose-500',
          icon: <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/70 border-amber-100',
          text: 'text-amber-800',
          dot: 'bg-amber-500',
          icon: <Info className="w-4 h-4 text-amber-600 shrink-0" />
        };
      case 'gemini':
        return {
          bg: 'bg-violet-50/70 border-violet-100',
          text: 'text-violet-900',
          dot: 'bg-violet-500',
          icon: <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
        };
      default:
        return {
          bg: 'bg-blue-50/70 border-blue-100',
          text: 'text-blue-800',
          dot: 'bg-blue-500',
          icon: <Info className="w-4 h-4 text-blue-600 shrink-0" />
        };
    }
  };

  return (
    <div className="w-full bg-slate-900 text-slate-100 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col h-full min-h-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1.5 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>操作日志 / Operation Log</span>
          </span>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="text-[11px] text-slate-400 hover:text-rose-400 font-bold px-2.5 py-1 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
            title="清空日志"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空</span>
          </button>
        )}
      </div>

      {/* Terminal View panel */}
      <div className="flex-1 overflow-y-auto max-h-[300px] font-mono text-xs space-y-2 pr-1 min-h-[180px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-550 text-center h-full">
            <Terminal className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-[11px] font-bold">⏳ 等待系统进程或语音指令运行...</p>
            <p className="text-[10px] mt-1 text-slate-500">所有麦克风输入与 AI 解析均在此展现</p>
          </div>
        ) : (
          [...logs].reverse().map((log) => {
            const styles = getLogStyles(log.type);
            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border flex gap-3 items-start bg-slate-950/80 border-slate-800 transition-all hover:bg-slate-950`}
              >
                {styles.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mb-0.5">
                    <span className="font-bold uppercase text-blue-400">
                      {log.type === 'gemini' ? 'Local NLP Parser' : log.type}
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap select-text break-words">
                    {log.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
