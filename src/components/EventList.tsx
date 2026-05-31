import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Trash2, Search, Clock, CalendarRange, Sparkles, Filter } from 'lucide-react';

interface EventListProps {
  events: CalendarEvent[];
  selectedDate: string;
  onDeleteEvent: (id: string) => void;
  onClearAll: () => void;
}

export default function EventList({ events, selectedDate, onDeleteEvent, onClearAll }: EventListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'selected' | 'all'>('all'); // Show all by default so user can see list clearly

  // Helper to determine relative day string
  const getRelativeDayName = (dateStr: string) => {
    if (dateStr === '2026-05-31') return '今天 (Today)';
    if (dateStr === '2026-06-01') return '明天 (Tomorrow)';
    if (dateStr === '2026-06-02') return '后天 (Day After)';
    
    // Fallback format
    const tempDate = new Date(dateStr);
    if (!isNaN(tempDate.getTime())) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return `${weekdays[tempDate.getDay()]}`;
    }
    return '';
  };

  const getFilteredEvents = () => {
    let filtered = events;
    
    if (viewMode === 'selected') {
      filtered = filtered.filter(e => e.date === selectedDate);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.date.includes(q) || 
        e.time.includes(q)
      );
    }

    // Sort by Date, then Time
    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.time.localeCompare(b.time);
    });
  };

  const filteredList = getFilteredEvents();

  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col h-full min-h-[460px]">
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-blue-600" />
            <span>日程安排清单</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {viewMode === 'selected' ? `显示 ${selectedDate} 的日程` : '显示所有已保存日程'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs font-bold text-rose-500 hover:text-rose-650 px-3.5 py-1.5 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
            >
              清空全部
            </button>
          )}
        </div>
      </div>

      {/* View Options Toggle & Search */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 w-4 h-4 top-3" />
          <input
            type="text"
            placeholder="搜索日程主题/时间..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 hover:bg-slate-100/60 focus:bg-white transition-all text-slate-700 font-semibold"
          />
        </div>

        {/* Filters */}
        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-250 self-start md:self-auto">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'all'
                ? 'bg-white shadow-3sm text-blue-600 border border-slate-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setViewMode('selected')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'selected'
                ? 'bg-white shadow-3sm text-blue-600 border border-slate-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            选中日期 ({selectedDate.substring(5)})
          </button>
        </div>
      </div>

      {/* Events Items Scroll panel */}
      <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-3 min-h-[220px]">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-705">
              {searchQuery ? '未找到符合条件的日程' : '暂无日程安排'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
              {searchQuery 
                ? '请尝试修改搜索词，或输入新的语音日程安排指令。' 
                : '您可以使用麦克风说出“明天下午三点腾讯面试”来瞬时录入。'}
            </p>
          </div>
        ) : (
          filteredList.map((event) => {
            const relDay = getRelativeDayName(event.date);
            return (
              <div
                key={event.id}
                className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl border border-slate-200 hover:border-blue-200 transition-all duration-300"
              >
                <div className="flex items-start gap-3.5">
                  {/* Decorative Left border indicator */}
                  <span className="w-1 h-9 bg-blue-500 rounded-full mt-0.5" />
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-900 transition-colors">
                      {event.title}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-bold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">
                        <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.date}</span>
                        {relDay && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-extrabold ml-1">
                            {relDay}
                          </span>
                        )}
                      </span>
                      
                      {event.time && (
                        <span className="flex items-center gap-1 font-mono text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.time}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteEvent(event.id)}
                  className="p-2 text-slate-450 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105"
                  title="删除日程"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Summary status footer */}
      {events.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-450 font-medium">
          <span>总计: <strong className="text-blue-600 font-extrabold">{events.length}</strong> 个已录入日程</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            <span>数据由 localStorage 安全持久化</span>
          </span>
        </div>
      )}
    </div>
  );
}
