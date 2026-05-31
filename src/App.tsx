import React, { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import EventList from './components/EventList';
import Logs from './components/Logs';
import VoicePanel from './components/VoicePanel';
import { CalendarEvent, LogEntry } from './types';
import { CalendarCheck, Shield, Mic, CheckCircle, HelpCircle, RefreshCw } from 'lucide-react';
import { parseVoiceText } from './utils/nlp';

export default function App() {
  // Use today 2026-05-31 as default selection reference
  const REFERENCE_DATE = '2026-05-31';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(REFERENCE_DATE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const storedEvents = localStorage.getItem('voice_calendar_events');
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      } else {
        // Mock starter events for product fidelity on initial load
        const defaultEvents: CalendarEvent[] = [
          {
            id: 'mock-1',
            title: '准备面试资料',
            date: '2026-05-31',
            time: '10:00',
            createdAt: new Date().toISOString()
          },
          {
            id: 'mock-2',
            title: '团队周会',
            date: '2026-06-03',
            time: '14:00',
            createdAt: new Date().toISOString()
          }
        ];
        setEvents(defaultEvents);
        localStorage.setItem('voice_calendar_events', JSON.stringify(defaultEvents));
      }

      // Initial friendly startup log
      const initialLog: LogEntry = {
        id: 'init',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        text: '🟢 语音日程助手已就绪运转！系统时间初始化至: 2026-05-31 (周日)'
      };
      setLogs([initialLog]);
    } catch (err) {
      console.error("Local storage initialization warning", err);
    }
  }, []);

  // Save to local storage whenever events update
  const saveEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem('voice_calendar_events', JSON.stringify(updated));
    } catch (err) {
      console.error("Error saving to local storage", err);
    }
  };

  // Helper to add helper logs
  const addLog = (type: LogEntry['type'], text: string) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      text
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Automated action runners triggered by Local NLP Parser
  const executeIntent = (parsed: { action: 'add' | 'query' | 'delete'; title: string; date: string; time: string }, voiceText: string) => {
    const { action, title, date, time } = parsed;
    addLog('gemini', `🧠 Local NLP 识别意图:\n动作 Action: "${action}"\n主题 Title: "${title || '(无)'}"\n日期 Date: "${date || '(未提供)'}"\n时间 Time: "${time || '(全天)'}"`);

    switch (action) {
      case 'add': {
        if (!title.trim()) {
          addLog('error', `⚠️ 无法添加日程：解析到的日程主题(title)为空。`);
          return;
        }

        const targetDate = date || REFERENCE_DATE;
        const newEvent: CalendarEvent = {
          id: `event-${Date.now()}`,
          title,
          date: targetDate,
          time,
          createdAt: new Date().toISOString()
        };

        const updatedEvents = [...events, newEvent];
        saveEvents(updatedEvents);
        
        // Auto select the added date to visualize in calendar
        setSelectedDate(targetDate);
        
        addLog('success', `📅 自动执行 [新增日程]:\n“${title}” 已成功添加到 ${targetDate} ${time ? '于 ' + time : ''}。`);
        break;
      }

      case 'delete': {
        if (!title.trim()) {
          addLog('error', `⚠️ 无法删除日程：未指定要删除的日程主题词。`);
          return;
        }

        // Fuzzy match events on that title
        const eventsBefore = events.length;
        // Match title fuzzy or exact (excluding letters casing if any)
        const updatedEvents = events.filter(e => {
          // If date is parsed, we lock search inside that specific date, otherwise search overall
          const dateMatch = date ? e.date === date : true;
          const titleMatch = e.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(e.title.toLowerCase());
          return !(dateMatch && titleMatch);
        });

        const deletedCount = eventsBefore - updatedEvents.length;

        if (deletedCount > 0) {
          saveEvents(updatedEvents);
          addLog('success', `🗑️ 自动执行 [删除日程]:\n已成功删除与“${title}”相关的 ${deletedCount} 个日程！`);
        } else {
          addLog('warning', `🔍 自动执行 [删除日程]:\n未在日历中找到匹配 “${title}” 的相关事件。`);
        }
        break;
      }

      case 'query': {
        const queryDate = date || REFERENCE_DATE;
        // Highlight the calendar visually
        setSelectedDate(queryDate);

        const found = events.filter(e => e.date === queryDate);
        if (found.length > 0) {
          const listText = found.map((e, idx) => `  ${idx + 1}. [${e.time || '全天'}] ${e.title}`).join('\n');
          addLog('success', `🔍 自动执行 [查询日程]:\n在 ${queryDate} 找到以下安排:\n${listText}`);
        } else {
          addLog('warning', `🔍 自动执行 [查询日程]:\n在 ${queryDate} 这天暂无任何日程安排。`);
        }
        break;
      }

      default:
        addLog('error', `⚠️ 无法匹配自动执行动作: Unrecognized action "${action}"`);
    }
  };

  // Call Rule-based Local NLP parser to resolve voice transcripts in browser
  const handleParseText = async (text: string) => {
    setIsLoading(true);
    addLog('info', `🧠 本地 NLP 精准解析中:“${text}”...`);

    // Tiny processing delay to give high fidelity realistic visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const result = parseVoiceText(text, REFERENCE_DATE);
      if ('type' in result && result.type === 'unknown') {
        throw new Error(result.message);
      }
      executeIntent(result as any, text);
    } catch (err: any) {
      console.error(err);
      addLog('error', `❌ 本地解析报错: ${err.message || '由于规则局限，未能提取有效指令。'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual tools
  const handleAddManualSelectedDay = () => {
    const title = prompt('请输入日程安排的标题:');
    if (!title || !title.trim()) return;
    const time = prompt('请输入日程的时间 (例如 "15:00"，全天则留空):') || '';
    
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: title.trim(),
      date: selectedDate,
      time: time.trim(),
      createdAt: new Date().toISOString()
    };
    saveEvents([...events, newEvent]);
    addLog('success', `📅 手动新增日程成功: "${title}" 于 ${selectedDate}`);
  };

  const handleDeleteEvent = (id: string) => {
    const item = events.find(e => e.id === id);
    const updated = events.filter(e => e.id !== id);
    saveEvents(updated);
    if (item) {
      addLog('info', `🗑️ 手动删除了日程: "${item.title}"`);
    }
  };

  const handleClearAll = () => {
    if (confirm('是否确定要清空所有的日程安排数据？此操作不可逆。')) {
      saveEvents([]);
      addLog('warning', '⚠️ 所有的日程安排数据已被彻底清空！');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* Premium Bento Header */}
      <header className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
          
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Voice Calendar
              </h1>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                智能语音日程助手 v1.0
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>智能本地解析已激活 (Rule NLP Active)</span>
            </div>
            <div className="px-4 py-2 bg-slate-100 rounded-full text-xs font-black text-slate-500 uppercase tracking-widest font-mono">
              2026-05-31
            </div>
          </div>

        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
        
        {/* Helper Banner to describe flow */}
        <div className="mb-6 p-4 bg-blue-50/40 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-2.5 items-center">
            <span className="text-lg">📢</span>
            <div className="text-xs text-blue-950 font-semibold leading-relaxed">
              <strong>演示使用贴士:</strong> 浏览器由于 iframe 安全策略可能限制麦克风启动。如果麦克风报错，可以随时使用
              <strong className="text-blue-600">“点击模拟说出”</strong> 或下方的输入框，同样可以 100% 连通并验证 
              <strong className="text-blue-650">本地智能 NLP 规则解析</strong>。
            </div>
          </div>
          <button 
            onClick={() => {
              // Quick reset to defaults
              if (confirm('是否重置系统状态（保留示例日程一并写入演示记录）？')) {
                const refreshed = [
                  { id: 'mock-1', title: '准备面试资料', date: '2026-05-31', time: '10:00', createdAt: new Date().toISOString() },
                  { id: 'mock-2', title: '团队周会', date: '2026-06-03', time: '14:00', createdAt: new Date().toISOString() }
                ];
                saveEvents(refreshed);
                setSelectedDate(REFERENCE_DATE);
                addLog('info', '🔄 系统状态图谱已重置！');
              }
            }}
            className="text-xs flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 shrink-0 px-3.5 py-2 hover:bg-blue-100/50 rounded-xl transition-all"
            title="重置测试日程"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重置日程</span>
          </button>
        </div>

        {/* Dynamic Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Interaction & Voice Controller (5 cols) */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Speech Controller Card */}
            <VoicePanel 
              onParseText={handleParseText} 
              isLoading={isLoading} 
              addLog={addLog} 
            />

            {/* Calendar display Card */}
            <Calendar 
              events={events} 
              selectedDate={selectedDate} 
              onSelectDate={(date) => {
                setSelectedDate(date);
                addLog('info', `📅 您点击选择了日历日期: ${date}`);
              }} 
            />

          </section>

          {/* RIGHT: Calendar events Lists & Telemetry Logs (7 cols) */}
          <section className="lg:col-span-7 flex flex-col gap-6 h-full">
            
            {/* Event List Container */}
            <div className="relative">
              <EventList 
                events={events} 
                selectedDate={selectedDate} 
                onDeleteEvent={handleDeleteEvent} 
                onClearAll={handleClearAll} 
              />
              
              {/* Optional Quick Manual Add FAB overlay on list */}
              <button
                onClick={handleAddManualSelectedDay}
                className="absolute right-8 bottom-16 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-950 rounded-xl shadow-lg transition-all flex items-center gap-1.5 hover:scale-105"
                title={`在选定的 ${selectedDate} 手动创建事件`}
              >
                <span>➕ 手动新建日程</span>
              </button>
            </div>

            {/* Logs component */}
            <Logs 
              logs={logs} 
              onClearLogs={handleClearLogs} 
            />

          </section>

        </div>

      </main>

      {/* Elegant minimalist Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-10 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
          <span>Voice Calendar © 2026 (本地纯前端演示版)</span>
          <div className="flex items-center gap-6">
            <a href="#how" onClick={() => alert('使用教程:\n1. 授予网页麦克风录音权限。\n2. 说出指令口诀，如“明天下午三点腾讯面试”。\n3. 系统通过本地 NLP 快速识别语音意图，零网络延迟。')} className="hover:text-blue-600 transition-colors">如何使用？</a>
            <span>Powered by Local NLP & Web Speech API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
