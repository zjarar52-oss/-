import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Play, Info, Sparkles, Send } from 'lucide-react';

interface VoicePanelProps {
  onParseText: (text: string) => void;
  isLoading: boolean;
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'gemini', text: string) => void;
}

export default function VoicePanel({ onParseText, isLoading, addLog }: VoicePanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Suggested commands from requirements
  const suggestions = [
    '明天下午三点腾讯面试',
    '我明天有什么安排',
    '删除腾讯面试'
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'zh-CN';
    rec.interimResults = false;

    rec.onstart = () => {
      setIsRecording(true);
      addLog('info', '🎙️ 麦克风已开启，正在听取您的中文指令，请说话...');
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      addLog('success', `🎤 语音识别成功: "${resultText}"`);
      onParseText(resultText);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      let errorMsg = '语音识别无法启动';
      if (event.error === 'not-allowed') {
        errorMsg = '麦克风权限被拒绝，或浏览器不支持在当前沙盒(iframe)中录音。如果您在预览环境中，请尝试点击右上角新窗口打开，或使用下方文本框、快速模拟指令。';
      } else if (event.error === 'no-speech') {
        errorMsg = '未检测到您的说话声音，请再试一次。';
      } else {
        errorMsg = `识别出错: ${event.error || '未知错误'}`;
      }
      addLog('error', `❌ 语音报错: ${errorMsg}`);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    setRecognitionInstance(rec);
  }, []);

  const toggleRecording = () => {
    if (!speechSupported) {
      addLog('warning', '⚠️ 当前浏览器暂不支持 Web Speech API，请使用下方的快捷模拟按钮或手动输入。');
      return;
    }

    if (isRecording) {
      recognitionInstance?.stop();
    } else {
      try {
        recognitionInstance?.start();
      } catch (err: any) {
        console.error(err);
        addLog('error', `❌ 启动语音录制失败: ${err.message || '实例冲突'}`);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onParseText(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500 animate-bounce" />
          <span>大声说出您的日程指令</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          使用 Web Speech 自动感应识别中文语音，并由本地 NLP 智能理解意图。您也可以直接点击下方的快捷虚拟指令演示。
        </p>
      </div>

      {/* Main Microphone Area */}
      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 relative overflow-hidden group">
        {/* Animated background sound waves when recording */}
        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-20 pointer-events-none">
            <span className="w-3 h-16 bg-blue-500 rounded-full animate-pulse" />
            <span className="w-3 h-24 bg-blue-500 rounded-full animate-pulse delay-75" />
            <span className="w-3 h-12 bg-blue-600 rounded-full animate-pulse delay-100" />
            <span className="w-3 h-28 bg-blue-400 rounded-full animate-pulse delay-150" />
            <span className="w-3 h-16 bg-blue-500 rounded-full animate-pulse delay-200" />
          </div>
        )}

        <button
          onClick={toggleRecording}
          disabled={isLoading}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200 scale-105 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:scale-105'
          } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
          title={isRecording ? '点击停止识别' : '点击开启麦克风大声说出您的日程指令'}
        >
          {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>

        <span className={`text-xs font-bold mt-4 transition-all uppercase tracking-wider ${
          isRecording ? 'text-rose-500 font-bold' : 'text-slate-400'
        }`}>
          {isRecording ? '正在录音中... (请说出中文指令)' : '点击麦克风开始录音'}
        </span>

        {isLoading && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-650 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-800">本地智能 NLP 正在分析语音细节...</span>
          </div>
        )}
      </div>

      {/* Suggested Commands Trigger Simulator */}
      <div className="space-y-3">
        <span className="text-xs font-black text-slate-400 block uppercase tracking-widest">
          💡 产品演示快捷键 (Quick Simulators)
        </span>
        <div className="grid grid-cols-1 gap-2">
          {suggestions.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => onParseText(phrase)}
              disabled={isLoading || isRecording}
              className="w-full flex items-center justify-between text-left px-4 py-3 text-xs bg-slate-50 hover:bg-blue-50/50 text-slate-700 rounded-xl transition-all border border-slate-100 hover:border-blue-100 font-semibold disabled:opacity-50 hover:translate-x-1"
            >
              <span className="truncate">“{phrase}”</span>
              <span className="flex items-center gap-1.5 text-[10px] text-blue-600 shrink-0 font-bold bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-3sm">
                <Play className="w-3 h-3 fill-blue-600 text-blue-600" />
                <span>点击键入</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Text input command */}
      <form onSubmit={handleManualSubmit} className="pt-4 border-t border-slate-100 flex gap-2.5">
        <input
          type="text"
          placeholder="或者在这里输入语音文本指令..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={isLoading || isRecording}
          className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 hover:bg-slate-100 focus:bg-white text-slate-700 disabled:opacity-50 transition-all font-semibold"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || isLoading || isRecording}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:bg-slate-100 disabled:text-slate-400 hover:scale-105"
          title="输入发送"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {!speechSupported && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-800 font-medium">
          <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <span>
            提示：当前安全沙盒或浏览器拦截了录音权限。请手动输入或点击快捷键模拟说出，同样可以体验 Gemini 的完美解析链路。
          </span>
        </div>
      )}
    </div>
  );
}
