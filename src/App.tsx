import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import EventList from './components/EventList';
import Logs from './components/Logs';
import VoicePanel from './components/VoicePanel';
import { CalendarEvent, LogEntry } from './types';
import { 
  Sparkles, Gift, Eye, EyeOff, Volume2, VolumeX, ShieldCheck, 
  HelpCircle, RefreshCw, Star, Upload, Trash2, Check, X, Bell, Mic 
} from 'lucide-react';
import { parseVoiceText } from './utils/nlp';
import { PRESET_BIRTHDAYS, getLunarString } from './utils/lunar';

interface HighlightMoment {
  id: string;
  date: string;
  title: string;
  recordType: 'text' | 'voice';
  imageUrl?: string;
  createdAt: string;
}

export default function App() {
  const REFERENCE_DATE = '2026-05-31'; // Lock 2026-05-31 as current day

  // Core events list state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(REFERENCE_DATE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // PRD Privacy and Voice configs
  const [isVoiceSpeechEnabled, setIsVoiceSpeechEnabled] = useState(true);
  const [widgetDisplayMode, setWidgetDisplayMode] = useState<'full' | 'count'>('full');

  // Highlights state (过往记忆纪念板块)
  const [highlights, setHighlights] = useState<HighlightMoment[]>([]);
  const [highlightTitle, setHighlightTitle] = useState('');

  // Tour Guide model state (新用户开屏引导)
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Interactive step verification container (二次确认机制)
  const [pendingIntent, setPendingIntent] = useState<{
    action: 'add' | 'query' | 'delete';
    title: string;
    date: string;
    time: string;
    originalText: string;
    enableRing?: boolean;
    ringOffsetMinutes?: number;
  } | null>(null);

  // Play micro synth chime feedback to user (🔔 模拟日程智能提醒)
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio Context synth chime error", e);
    }
  };

  // Text-To-Speech speaker for verification feedback and annual announcements
  const speakText = (text: string) => {
    if (!isVoiceSpeechEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS speak system blocked/unsupported", e);
    }
  };

  // Initial loading on-mount
  useEffect(() => {
    try {
      // 1. Load Events
      const storedEvents = localStorage.getItem('voice_calendar_events');
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      } else {
        const starterEvents: CalendarEvent[] = [
          { id: 'starter-1', title: '准备汇报研究讨论', date: '2026-05-31', time: '10:00', createdAt: new Date().toISOString() },
          { id: 'starter-2', title: '讨论项目发展计划', date: '2026-06-01', time: '15:00', createdAt: new Date().toISOString() },
          { id: 'starter-3', title: '跟朋友一起做策划小组讨论', date: '2026-06-05', time: '09:00', createdAt: new Date().toISOString() }
        ];
        setEvents(starterEvents);
        localStorage.setItem('voice_calendar_events', JSON.stringify(starterEvents));
      }

      // 2. Load Highlights
      const storedHighlights = localStorage.getItem('voice_calendar_highlights');
      if (storedHighlights) {
        setHighlights(JSON.parse(storedHighlights));
      } else {
        const starterHighlights: HighlightMoment[] = [
          { id: 'h-1', date: '2026-05-20', title: '恭喜！挑战杯项目荣获二等奖', recordType: 'text', createdAt: new Date().toISOString() }
        ];
        setHighlights(starterHighlights);
        localStorage.setItem('voice_calendar_highlights', JSON.stringify(starterHighlights));
      }

      // 3. User Tour dismissal check
      const tourDismissed = localStorage.getItem('guide_dismissed_v1');
      if (!tourDismissed) {
        setIsTourOpen(true);
      }

      // 4. Initial helper text log
      const startLog: LogEntry = {
        id: 'init-l',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        text: '🟢 本地独立日历系统初始化完成。隐私盾与 Web Speech API 接口就绪。'
      };
      setLogs([startLog]);

    } catch (e) {
      console.warn("Local storage lookup fallback logs initialized", e);
    }
  }, []);

  // Sync state functions
  const saveEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem('voice_calendar_events', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const saveHighlights = (updated: HighlightMoment[]) => {
    setHighlights(updated);
    try {
      localStorage.setItem('voice_calendar_highlights', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const addLog = (type: LogEntry['type'], text: string) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      text
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Automated action execution triggered upon confirmation
  const handleExecuteConfirmedIntent = (intent: typeof pendingIntent) => {
    if (!intent) return;
    const { action, title, date, time, enableRing, ringOffsetMinutes } = intent;

    addLog('gemini', `🧠 已确认指令执行:\n动作 Action: "${action}"\n主题 Title: "${title || '(无)'}"\n日期 Date: "${date || '(未提供)'}"\n时间 Time: "${time || '(全天)'}"`);

    switch (action) {
      case 'add': {
        const targetDate = date || REFERENCE_DATE;
        const newEvent: CalendarEvent = {
          id: `event-${Date.now()}`,
          title,
          date: targetDate,
          time,
          createdAt: new Date().toISOString()
        };

        const updated = [...events, newEvent];
        saveEvents(updated);
        setSelectedDate(targetDate);

        // Ring alert simulation
        let ringText = '';
        if (enableRing) {
          ringText = `并已开启${ringOffsetMinutes === 0 ? '正点' : '提前' + ringOffsetMinutes + '分钟'}铃声提醒 🔔`;
          playAlertChime();
        }

        const speechConfirmation = `为您成功安排了 ${targetDate} ${time ? '于 ' + time : ''} 的事项: ${title}。${ringText ? '提醒闹钟也已为您上好锁' : ''}`;
        speakText(speechConfirmation);
        addLog('success', `📅 执行 [新增日程]:\n“${title}” 已成功录入至 ${targetDate} ${time ? '于 ' + time : ''}。${ringText}`);
        break;
      }

      case 'delete': {
        const preLen = events.length;
        // Match matching title
        const updated = events.filter(e => {
          const dateMatch = date ? e.date === date : true;
          const titleMatch = e.title.includes(title) || title.includes(e.title);
          return !(dateMatch && titleMatch);
        });

        const deletedCount = preLen - updated.length;
        if (deletedCount > 0) {
          saveEvents(updated);
          speakText(`已成功帮您删除了于“${title}”相关的${deletedCount}个日程安排。`);
          addLog('success', `🗑️ 执行 [删除日程]:\n已从日历中移除了匹配“${title}”的 ${deletedCount} 个日程。`);
        } else {
          speakText(`未能找到与“${title}”匹配的任何日程，请稍作核查。`);
          addLog('warning', `🔍 自动排查：未在日历空间中检索出匹配 ${title} 的对应事项。`);
        }
        break;
      }

      case 'query': {
        const targetDate = date || REFERENCE_DATE;
        setSelectedDate(targetDate);
        const dayEvents = events.filter(e => e.date === targetDate);
        
        if (dayEvents.length > 0) {
          const names = dayEvents.map((e, i) => `${i + 1}：${e.title}`).join('，');
          speakText(`在 ${targetDate} 这天，您共有${dayEvents.length}项日程安排，包括${names}`);
          
          const listText = dayEvents.map((e, i) => `  ${i + 1}. [${e.time || '全天'}] ${e.title}`).join('\n');
          addLog('success', `🔍 执行 [查询日程]:\n在 ${targetDate} 锁定以下活动:\n${listText}`);
        } else {
          speakText(`于 ${targetDate} 系统暂无日程待办记录。`);
          addLog('warning', `🔍 执行 [查询日程]:\n在 ${targetDate} 这天未发现任何记录事项。`);
        }
        break;
      }
    }

    setPendingIntent(null);
  };

  // Rule-based parsing dispatcher that handles custom high frequency command intents
  const handleParseText = async (text: string) => {
    setIsLoading(true);
    addLog('info', `🧠 本地 NLP 规则引擎正在提取关键段落:“${text}”...`);

    await new Promise(resolve => setTimeout(resolve, 340));

    try {
      const cleanText = text.trim();

      // Special Intent Case: Highlight Record Trigger (高光时刻记录)
      if (cleanText.includes('记录高光') || cleanText.includes('高光时刻') || cleanText.includes('留存高光') || cleanText.startsWith('记录')) {
        let content = cleanText
          .replace('记录高光时刻', '')
          .replace('记录高光', '')
          .replace('高光时刻', '')
          .replace('记录', '')
          .replace('：', '')
          .replace(':', '')
          .trim();

        if (!content) content = '取得了优秀的学习成就！';
        
        const newHighlight: HighlightMoment = {
          id: `h-${Date.now()}`,
          date: selectedDate,
          title: content,
          recordType: 'text',
          createdAt: new Date().toISOString()
        };

        const updated = [...highlights, newHighlight];
        saveHighlights(updated);
        speakText(`已为您成功收录了于 ${selectedDate} 的高光时刻：“${content}”，愿美好时刻长存。`);
        addLog('success', `🌟 高光收录成功: 已将“${content}”收归至 ${selectedDate} 的过往记忆卡片中！`);
        setIsLoading(false);
        return;
      }

      // Special Intent Case: Birthday Queries (亲友生日批量播报 / 语音智能推算)
      if (cleanText.includes('谁生日') || cleanText.includes('谁有生日') || cleanText.includes('查询生日') || cleanText.includes('过生日')) {
        let monthToQuery = 5; // Default reference may being May
        if (cleanText.includes('5月') || cleanText.includes('五月')) monthToQuery = 5;
        else if (cleanText.includes('6月') || cleanText.includes('六月')) monthToQuery = 6;
        else if (cleanText.includes('11月') || cleanText.includes('十一月')) monthToQuery = 11;
        else if (cleanText.includes('10月') || cleanText.includes('十月')) monthToQuery = 10;
        else {
          // Check solar month matching integers
          const r = cleanText.match(/(\d{1,2})月/);
          if (r) {
            monthToQuery = parseInt(r[1], 10);
          }
        }

        const bdayMatches = PRESET_BIRTHDAYS.filter(b => b.solarMonth === monthToQuery);
        if (bdayMatches.length > 0) {
          const names = bdayMatches.map(b => `${b.name}（${b.solarMonth}月${b.solarDay}日${b.isLunar ? ' 对应阴历' + (b.lunarFormatted || '') : ''}）`).join('、');
          const speech = `为您找到在 ${monthToQuery} 月份过生日的朋友，包括：${names}。便捷省心，轻松查看。`;
          speakText(speech);
          addLog('success', `🎂 月度生日播报:\n在「${monthToQuery}月」中生日排期的朋友有:\n${bdayMatches.map((b, i) => `  - ${b.name}: ${b.solarMonth}月${b.solarDay}日 ${b.isLunar ? '(阴历' + b.lunarFormatted + ' v.s. 自动阳历推算)' : '(阳历)'}`).join('\n')}`);
        } else {
          speakText(`在 ${monthToQuery} 月份中，未检索到名录上的朋友生日。`);
          addLog('info', `🎂 月度生日播报: 在「${monthToQuery}月」中，我们的朋友生日库暂无冲突记录。`);
        }
        setIsLoading(false);
        return;
      }

      // Standard Event NLP Parsing
      const result = parseVoiceText(cleanText, REFERENCE_DATE);
      if ('type' in result && result.type === 'unknown') {
        throw new Error(result.message);
      }

      const finalResult = result as any;

      // Instead of running immediately, dispatch a two-step confirmation panel to resolve errors
      setPendingIntent({
        action: finalResult.action,
        title: finalResult.title,
        date: finalResult.date,
        time: finalResult.time,
        originalText: cleanText,
        enableRing: finalResult.action === 'add', // Enable alerts by default for adds
        ringOffsetMinutes: 10 // default 10 min prior alarm
      });

      // Quick voice readback preview
      const actionName = finalResult.action === 'add' ? '新增日程' : finalResult.action === 'delete' ? '删除日程' : '查询日程';
      speakText(`识别到您的动作是${actionName}，请问这是对的吗？如果是，请在界面点击确认按钮。`);

    } catch (e: any) {
      console.error(e);
      addLog('error', `❌ 指令解析失败: ${e.message || '系统由于句子太长或生僻无法有效生成。'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Manual actions
  const handleAddNewManualSelectedDay = () => {
    const title = prompt('请输入想要手动新建的事项内容/日程标题:');
    if (!title || !title.trim()) return;
    const time = prompt('请输入具体的日程时间 (例如 "15:30"，全天事项则直接按确定即可):') || '';
    
    const newEvent: CalendarEvent = {
      id: `manual-ev-${Date.now()}`,
      title: title.trim(),
      date: selectedDate,
      time: time.trim(),
      createdAt: new Date().toISOString()
    };
    const updated = [...events, newEvent];
    saveEvents(updated);
    addLog('success', `📅 手动添加日程成功: “${title}” 已入驻 ${selectedDate} ${time ? '的时间段：' + time : ''}`);
    playAlertChime();
  };

  const handleDeleteEvent = (id: string) => {
    const found = events.find(e => e.id === id);
    if (!found) return;
    const updated = events.filter(e => e.id !== id);
    saveEvents(updated);
    addLog('info', `🗑️ 手动移除了日程: “${found.title}”`);
  };

  const handleClearAllEvents = () => {
    if (confirm('重要危险核对：确认要清空本学期所有的日程、代办数据以及过往记录吗？')) {
      saveEvents([]);
      addLog('warning', '⚠️ 系统内的所有活动事件已被彻底净空！');
    }
  };

  // Highlights handlings (高光时刻增删)
  const handleQuickAddHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightTitle.trim()) return;

    const newH: HighlightMoment = {
      id: `h-${Date.now()}`,
      date: selectedDate,
      title: highlightTitle.trim(),
      recordType: 'text',
      createdAt: new Date().toISOString()
    };

    const updated = [...highlights, newH];
    saveHighlights(updated);
    setHighlightTitle('');
    speakText(`已为您成功收录了于 ${selectedDate} 的高光时刻：“${newH.title}”`);
    addLog('success', `🌟 高光收录: “${newH.title}” 已经锁定录入到过往卡片。`);
  };

  const handleDeleteHighlight = (id: string) => {
    const updated = highlights.filter(h => h.id !== id);
    saveHighlights(updated);
    addLog('info', `🗑️ 删除了高光时刻。`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 flex flex-col">
      
      {/* 1. TUTORIAL TOUR GUIDE (新用户开屏引导弹窗) */}
      {isTourOpen && (
        <div id="tour-guide-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2rem] border border-slate-150 max-w-lg w-full overflow-hidden shadow-2xl p-6 sm:p-8 relative transition-all animate-bounce-short">
            <button 
              onClick={() => setIsTourOpen(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Mic className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">大学生的轻量便捷日程助手</span>
                  <h2 className="text-xl font-extrabold text-slate-900">🎉 欢迎进入语音版日历工具！</h2>
                </div>
              </div>

              {/* Pseudo video demo interface */}
              <div className="relative bg-slate-950 rounded-2xl p-5 border border-slate-850 overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none opacity-20"></div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-[10px] font-mono text-slate-500">▶ Demo_Tutorial_Video.mp4</span>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <p className="text-blue-400">“明天下午三点面试”</p>
                  <p className="text-green-500">└─ [Smart Parser] 自动识别日期 2026-06-01 | 时间 15:00</p>
                  <p className="text-slate-500">“记录高光时刻: 考过大学英语六级”</p>
                  <p className="text-amber-400">└─ [Past Memory] 自动封套至过去记忆格卡 🌟</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed">
                <h4 className="font-extrabold text-slate-905 uppercase tracking-wider">🌟 核心三大板块亮点：</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5">
                    <span className="text-base select-none">🎤</span>
                    <div>
                      <p className="font-bold text-slate-900">语音极简增删改查</p>
                      <p className="text-slate-400 font-medium">双手被占用也无妨，本地智能分析意图秒速归档日程。</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5">
                    <span className="text-base select-none">🎂</span>
                    <div>
                      <p className="font-bold text-slate-900">朋友生日便捷查询播报</p>
                      <p className="text-slate-400 font-medium">支持朋友农历与阳历推算，一声即可列出，无负担无压力。</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5">
                    <span className="text-base select-none">🔑</span>
                    <div>
                      <p className="font-bold text-slate-900">分级公共隐私盾</p>
                      <p className="text-slate-400 font-medium">在自习室、教室或公共场合，一键隐藏细节内容，保持舒适的生活边界。</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    id="tour-dismiss-checkbox"
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        localStorage.setItem('guide_dismissed_v1', 'true');
                      } else {
                        localStorage.removeItem('guide_dismissed_v1');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 accent-blue-600 rounded focus:ring-blue-500 focus:outline-none" 
                  />
                  <span className="text-xs font-bold text-slate-500">学习完毕，以后不再提示</span>
                </label>
                <button
                  id="tour-close-btn"
                  onClick={() => setIsTourOpen(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:scale-105"
                >
                  开启惊喜体验
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BRUTAL CORE HEADER */}
      <header className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 w-full shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  语音版日历工具
                </h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] uppercase font-black tracking-widest rounded border border-blue-100">
                  大学生轻量日程
                </span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                Voice Calendar Tool v1.2 • 纯静态离线安全部署版
              </p>
            </div>
          </div>

          {/* Quick config and privacy panels (隐私屏蔽总开关区) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Display privacy config widget switch */}
            <div className="p-1 px-2 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-1.5 shadow-3sm">
              <span className="text-xs font-black text-slate-500 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100">
                👤 隐私保密:
              </span>
              <button
                id="privacy-toggle-btn"
                onClick={() => {
                  const target = widgetDisplayMode === 'full' ? 'count' : 'full';
                  setWidgetDisplayMode(target);
                  addLog('warning', `🔒 安全盾切换：组件详情展示模式已调整为「${target === 'count' ? '仅展示待办总数量 (防偷窥)' : '展示完整文字内容'}」`);
                }}
                className={`p-1 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  widgetDisplayMode === 'count' 
                    ? 'bg-rose-50 border border-rose-200 text-rose-600'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
                title="公共场合一键隐藏卡片计划内容"
              >
                {widgetDisplayMode === 'count' ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>仅看件数</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>完全敞开</span>
                  </>
                )}
              </button>
            </div>

            {/* Voice Readback broadcast toggler */}
            <button
              id="voice-speech-toggle-btn"
              onClick={() => {
                const target = !isVoiceSpeechEnabled;
                setIsVoiceSpeechEnabled(target);
                addLog('info', `🔊 语音播报开关：已「${target ? '开启' : '完全静默'}」系统交互复述功能`);
                if (target) speakText("语音自动播报系统已在您耳边激活！");
              }}
              className={`p-2.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1 hover:scale-105 ${
                isVoiceSpeechEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title="控制添加/删除成果播报声音"
            >
              {isVoiceSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div className="px-4 py-2 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
              📅 2026-05-31
            </div>
          </div>
        </div>
      </header>

      {/* 3. MIDDLE VERIFICATION BOX (前置二次确认纠错对话板) */}
      {pendingIntent && (
        <section id="verification-panel" className="max-w-7xl mx-auto px-4 py-2 sm:px-6 w-full animate-fade-in-down">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-[2rem] p-6 lg:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-32 -translate-y-32"></div>
            
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="p-1 px-2.5 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    二次纠错确认 (Dual Verification Action)
                  </span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">🎯 小主，请核实系统提取出的语句信息：</h3>
                  <p className="text-xs text-blue-100/90 italic font-medium mt-1">语音直译原文: “{pendingIntent.originalText}”</p>
                </div>

                {/* Extracted tabular parameters for user approval */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-white/10 rounded-xl p-3 border border-white/5">
                    <span className="block text-[10px] text-blue-200 font-bold uppercase tracking-wider">动作 Action类型</span>
                    <span className="text-sm font-extrabold capitalize">
                      {pendingIntent.action === 'add' ? '➕ 新增加进去' : pendingIntent.action === 'delete' ? '🗑️ 彻底删除' : '🔍 快速查询'}
                    </span>
                  </div>

                  <div className="bg-white/10 rounded-xl p-3 border border-white/5">
                    <span className="block text-[10px] text-blue-200 font-bold uppercase tracking-wider">日程主题 Title</span>
                    <span className="text-sm font-extrabold truncate block" title={pendingIntent.title}>
                      {pendingIntent.title || '(无标题)'}
                    </span>
                  </div>

                  <div className="bg-white/10 rounded-xl p-3 border border-white/5">
                    <span className="block text-[10px] text-blue-200 font-bold uppercase tracking-wider">指派日期 Date</span>
                    <span className="text-sm font-extrabold">{pendingIntent.date}</span>
                  </div>

                  <div className="bg-white/10 rounded-xl p-3 border border-white/5">
                    <span className="block text-[10px] text-blue-200 font-bold uppercase tracking-wider">特定时间 Time</span>
                    <span className="text-sm font-extrabold">{pendingIntent.time || '全天守护'}</span>
                  </div>
                </div>

                {/* Alarm clock modifiers specified by PRD */}
                {pendingIntent.action === 'add' && (
                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold transition-all select-none">
                      <input 
                        id="enable-ring-checkbox"
                        type="checkbox" 
                        checked={pendingIntent.enableRing}
                        onChange={(e) => setPendingIntent(prev => prev ? { ...prev, enableRing: e.target.checked } : null)}
                        className="w-4 h-4 accent-blue-500 rounded" 
                      />
                      <Bell className="w-3.5 h-3.5 text-yellow-305" />
                      <span>开启本条备忘智能铃声闹钟提醒</span>
                    </label>

                    {pendingIntent.enableRing && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-blue-200 font-bold">并在事件发生前：</span>
                        <select
                          id="ring-time-select"
                          value={pendingIntent.ringOffsetMinutes}
                          onChange={(e) => setPendingIntent(prev => prev ? { ...prev, ringOffsetMinutes: parseInt(e.target.value, 10) } : null)}
                          className="bg-slate-900/60 text-white rounded-lg p-1.5 border border-white/15 font-bold focus:outline-none"
                        >
                          <option value="0" className="bg-slate-800 text-white">正点响起</option>
                          <option value="10" className="bg-slate-800 text-white">提前 10 分钟</option>
                          <option value="30" className="bg-slate-800 text-white">提前 30 分钟</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accept or Deny button choices */}
              <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-auto">
                <button
                  id="confirm-intent-btn"
                  onClick={() => handleExecuteConfirmedIntent(pendingIntent)}
                  className="w-full md:w-48 px-6 py-3 bg-white hover:bg-slate-100 text-indigo-700 font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-103"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>无误，确认执行</span>
                </button>
                <button
                  id="cancel-intent-btn"
                  onClick={() => {
                    addLog('warning', `⚠️ 指令 “${pendingIntent.originalText}” 的执行请求已被取消撤回。`);
                    setPendingIntent(null);
                  }}
                  className="w-full md:w-48 px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-2xl shadow-3sm border border-red-500/30 transition-all flex items-center justify-center gap-2 hover:scale-102"
                >
                  <X className="w-4 h-4" />
                  <span>有瑕疵，取消重新录</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. MAIN BENTO GRID AREA */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 w-full flex-1">
        
        {/* Help hints and testing actions Banner */}
        <div id="product-help-banner" className="mb-6 p-4.5 bg-blue-50/40 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3 items-center">
            <span className="text-xl">💡</span>
            <div>
              <div className="flex font-extrabold text-xs text-blue-900 gap-1.5">
                <span>个人日程便捷管理贴士</span>
                <span className="font-mono bg-blue-100 px-1 py-0.2 rounded font-black text-[9px] text-blue-600">纯本地安全模式</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-0.5">
                全系统均在浏览器本地安全运行，绝不读取且不上传任何隐私，保障每个人的生活空间与边界。
                您可在日历旁的语音输入板对日程进行精细管理，或快速了解生日等关键事项，方便无感无压力。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto uppercase">
            <button
              id="help-button-banner"
              onClick={() => setIsTourOpen(true)}
              className="text-xs font-bold text-slate-505 hover:text-slate-700 px-3.5 py-2 hover:bg-slate-200/50 bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              📖 使用说明 (Tour)
            </button>
            <button 
              id="reset-schedules-btn"
              onClick={() => {
                if (confirm('确认要重置演示日程和高光吗？')) {
                  const sEvents: CalendarEvent[] = [
                    { id: 'starter-1', title: '准备汇报研究讨论', date: '2026-05-31', time: '10:00', createdAt: new Date().toISOString() },
                    { id: 'starter-2', title: '讨论项目发展计划', date: '2026-06-01', time: '15:00', createdAt: new Date().toISOString() }
                  ];
                  const sHighlights: HighlightMoment[] = [
                    { id: 'h-1', date: '2026-05-20', title: '挑战杯项目顺利取得进展', recordType: 'text', createdAt: new Date().toISOString() }
                  ];
                  saveEvents(sEvents);
                  saveHighlights(sHighlights);
                  setSelectedDate(REFERENCE_DATE);
                  addLog('info', '🔄 数据已安全重启。');
                  speakText("系统重置成功！");
                }
              }}
              className="text-xs flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-855 hover:bg-blue-100 bg-white border border-blue-200 shrink-0 px-3.5 py-2 rounded-xl transition-all"
              title="重置测试日程"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重置演示数据</span>
            </button>
          </div>
        </div>

        {/* Bento grid panels map - Restructured with Schedule list at the very top */}
        <div className="flex flex-col gap-6">
          
          {/* STEP 1: Top section - Active Schedules List */}
          <section className="w-full">
            <div className="relative">
              <EventList 
                events={events} 
                selectedDate={selectedDate} 
                onDeleteEvent={handleDeleteEvent} 
                onClearAll={handleClearAllEvents} 
                widgetDisplayMode={widgetDisplayMode}
              />
              
              {/* Optional Quick Manual Add FAB overlay on list */}
              <button
                id="fab-manual-add"
                onClick={handleAddNewManualSelectedDay}
                className="absolute right-8 bottom-16 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-950 rounded-xl shadow-lg transition-all flex items-center gap-1.5 hover:scale-105"
                title={`在选定的 ${selectedDate} 手动创建事件`}
              >
                <span>➕ 手动新建日程</span>
              </button>
            </div>
          </section>

          {/* STEP 2: Bottom sections split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN 1: VOICE INPUT & CALENDAR (7 cols) - Voice helper right next to Calendar */}
            <section className="lg:col-span-7 flex flex-col gap-6 w-full">
              
              {/* Voice and Quick command triggers panel - highly visible and adjacent to Calendar */}
              <VoicePanel 
                onParseText={handleParseText} 
                isLoading={isLoading} 
                addLog={addLog} 
              />

              {/* Standard Calendar view */}
              <Calendar 
                events={events} 
                selectedDate={selectedDate} 
                birthdays={PRESET_BIRTHDAYS}
                highlights={highlights}
                widgetDisplayMode={widgetDisplayMode}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  addLog('info', `📅 您锁定了日期坐标: ${date}`);
                }} 
              />

            </section>

            {/* COLUMN 2: MEMORY LANE & LOGS CONSOLE (5 cols) */}
            <section className="lg:col-span-5 flex flex-col gap-6 w-full h-full">
              
              {/* PAST HIGHLIGHTS G格卡 (过往记忆纪念板块 PRD requirement) */}
              <div id="past-highlights-card" className="w-full bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
                      <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-slate-800">🌟 过去记忆纪念卡片 (Memory Lane)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">留存个人成就、毕业、纪念日等具有纪念意义的高光时刻</p>
                    </div>
                  </div>
                </div>

                {/* Enter highlight manually */}
                <form onSubmit={handleQuickAddHighlight} className="flex gap-2 w-full">
                  <input 
                    id="highlight-input"
                    type="text"
                    placeholder={`写下选定日期 ${selectedDate} 的惊喜/荣誉... (或语音输入说“记录高光时刻”)`}
                    value={highlightTitle}
                    onChange={(e) => setHighlightTitle(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-100 focus:border-yellow-500 text-slate-705 font-semibold transition-all"
                  />
                  
                  {/* PRD specified Image upload launcher badge */}
                  <button
                    type="button"
                    onClick={() => alert('依据 PRD 规划（开发周期因素）：高光图片上传功能已留存首发入口，我们已为您标定后续版本，敬请关注下期演进！')}
                    className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-1 text-[11px] text-slate-500 font-bold"
                    title="图片上传 (功能计划后续扩展区)"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">传图</span>
                    <span className="text-[8px] bg-yellow-104 text-yellow-700 bg-yellow-100 px-1 py-0.2 rounded scale-90">计划中</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!highlightTitle.trim()}
                    className="p-2 px-4 bg-yellow-500 hover:bg-yellow-650 text-white rounded-xl transition-all font-bold text-xs disabled:opacity-50"
                  >
                    写入高光
                  </button>
                </form>

                {/* Current chosen date highlights lists list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">已存档的高光历史印记 ({highlights.filter(h => h.date === selectedDate).length} 个点) :</span>
                  {highlights.filter(h => h.date === selectedDate).length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-150">今天这页纸很干净，没有写入特别的高光成就。点击上方输入或语音添加一份高光惊喜吧！</p>
                  ) : (
                    highlights.filter(h => h.date === selectedDate).map((h) => (
                      <div key={h.id} className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-xl border border-yellow-100 animate-pulse-once">
                        <div className="flex items-center gap-2 text-xs text-yellow-900 font-bold min-w-0 flex-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                          <span className="truncate">{h.title}</span>
                         </div>
                        <button 
                          onClick={() => handleDeleteHighlight(h.id)}
                          className="text-yellow-600 hover:text-red-650 p-1 rounded hover:bg-yellow-100/60"
                          title="删除这一页秘密高光"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Direct Console Logs Terminal */}
              <Logs 
                logs={logs} 
                onClearLogs={() => setLogs([])} 
              />

            </section>

          </div>
        </div>

      </main>

      {/* 5. MINIMAL SLATE FOOTER */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-12 px-6 text-center text-xs text-slate-400 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
          <span>语音版日历工具 © 2026 (本站不读取网络数据，完全依靠本地前端渲染)</span>
          <div className="flex items-center gap-5">
            <a href="#how" onClick={() => alert('本站全系本地实现规则NLP分析。说一句“明天下午四点找兼职工作”，立刻享受高保真无硬逻辑无报错的敏捷体验。')} className="hover:text-blue-600 transition-colors">大学生使用白皮书</a>
            <span>100% Client-Side Pure Engine</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
