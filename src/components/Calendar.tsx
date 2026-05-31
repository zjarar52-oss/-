import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Gift, Star } from 'lucide-react';
import { CalendarEvent } from '../types';
import { PRESET_BIRTHDAYS, getLunarString } from '../utils/lunar';

interface CalendarProps {
  events: CalendarEvent[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  birthdays?: Array<{ id: string; name: string; solarMonth: number; solarDay: number; isLunar: boolean; lunarFormatted?: string }>;
  highlights?: Array<{ id: string; date: string; title: string }>;
  widgetDisplayMode?: 'full' | 'count';
}

export default function Calendar({ 
  events, 
  selectedDate, 
  onSelectDate, 
  birthdays = PRESET_BIRTHDAYS, 
  highlights = [],
  widgetDisplayMode = 'full'
}: CalendarProps) {
  // Let the initial view be May 2026 based on reference date 2026-05-31
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 4, 31)); // May 2026

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0 to 11

  // Navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthNames = [
    '一月 (January)', '二月 (February)', '三月 (March)', '四月 (April)', 
    '五月 (May)', '六月 (June)', '七月 (July)', '八月 (August)', 
    '九月 (September)', '十月 (October)', '十一月 (November)', '十二月 (December)'
  ];

  // Compute days
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // Day of week for day 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create grid arrays
  const daysGrid: (number | null)[] = [];
  // Fill leading empty pads
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  // Fill actual day numbers
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i);
  }

  const formatDayString = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const hasEventOnDate = (dateStr: string) => {
    return events.some(e => e.date === dateStr);
  };

  const getDayEvents = (dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  };

  const isToday = (dateStr: string) => {
    return dateStr === '2026-05-31'; // Lock 2026-05-31 as current day
  };

  // Find birthday by current grid date
  const getBirthdayForDate = (m: number, d: number) => {
    return birthdays.find(b => b.solarMonth === m && b.solarDay === d);
  };

  // Check if grid date has highlights
  const getHighlightsForDate = (dateStr: string) => {
    return highlights.filter(h => h.date === dateStr);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div id="calendar-card" className="w-full bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {year}年 {monthNames[month]}
            </h2>
            <p className="text-xs text-slate-400 font-medium">切换年份体验跨年记忆自动换算</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            id="prev-month-btn"
            onClick={prevMonth}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-650 transition-all hover:scale-105"
            title="上个月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            id="back-today-btn"
            onClick={() => setCurrentMonth(new Date(2026, 4, 31))}
            className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
            title="回到2026年5月"
          >
            今天
          </button>
          <button
            id="next-month-btn"
            onClick={nextMonth}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-650 transition-all hover:scale-105"
            title="下个月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Titles */}
      <div className="grid grid-cols-7 text-center gap-2 mb-3">
        {weekDays.map((day, idx) => (
          <span 
            key={idx} 
            className={`text-xs font-black uppercase tracking-wider py-1 ${
              idx === 0 || idx === 6 ? 'text-rose-400' : 'text-slate-305'
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysGrid.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square"></div>;
          }

          const dateStr = formatDayString(day);
          const isSelected = selectedDate === dateStr;
          const currentDayHasEvents = hasEventOnDate(dateStr);
          const currentDayEvents = getDayEvents(dateStr);
          const currentIsToday = isToday(dateStr);
          const currentBirthday = getBirthdayForDate(month + 1, day);
          const currentHighlights = getHighlightsForDate(dateStr);

          // Render appropriate card border styles
          let borderStyle = 'border-slate-100 hover:border-slate-200';
          if (isSelected) {
            borderStyle = 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-400 text-blue-700 font-bold scale-102 shadow-sm';
          } else if (currentIsToday) {
            borderStyle = 'bg-rose-50/60 border-rose-200 text-rose-600 font-extrabold';
          } else if (currentBirthday) {
            borderStyle = 'bg-amber-50/40 border-amber-200 text-amber-800';
          }

          return (
            <button
              key={`day-${day}`}
              id={`day-cell-${dateStr}`}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square relative rounded-xl flex flex-col justify-between p-1.5 sm:p-2 transition-all border ${borderStyle}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-semibold">{day}</span>
                <div className="flex gap-0.5">
                  {/* Presets and birthday cakes */}
                  {currentBirthday && (
                    <span className="text-[10px]" title={`寿星生日: ${currentBirthday.name}`}>
                      🎂
                    </span>
                  )}
                  {/* Highlights representation */}
                  {currentHighlights.length > 0 && (
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" title="高光纪念时刻" />
                  )}
                </div>
              </div>
              
              {/* Event indicators */}
              {currentDayHasEvents && (
                <div className="mt-auto flex flex-wrap gap-1">
                  {widgetDisplayMode === 'count' ? (
                    // In Privacy mode, display a locked key indicator instead
                    <span className="text-[9px] text-slate-400">🔒</span>
                  ) : (
                    <>
                      {currentDayEvents.slice(0, 3).map((_, evIdx) => (
                        <span 
                          key={evIdx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-blue-500' : 'bg-blue-400'
                          }`}
                        />
                      ))}
                      {currentDayEvents.length > 3 && (
                        <span className="text-[9px] leading-none font-bold text-blue-500">+</span>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Today blinker */}
              {currentIsToday && !isSelected && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Lunar & Birthday Quick Info banner for student */}
      <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">📅 纪念日历播报</span>
        {(() => {
          const m = parseInt(selectedDate.split('-')[1], 10);
          const d = parseInt(selectedDate.split('-')[2], 10);
          const lunar = getLunarString(m, d);
          const bdayObj = birthdays.find(b => b.solarMonth === m && b.solarDay === d);
          const hsObj = highlights.filter(h => h.date === selectedDate);

          return (
            <div className="text-xs text-slate-700 font-semibold space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 bg-white border border-slate-100 px-1.5 py-0.5 rounded font-bold">公历: {m}月{d}日</span>
                <span className="text-emerald-600 bg-white border border-slate-100 px-1.5 py-0.5 rounded font-bold">{lunar}</span>
              </div>
              {bdayObj && (
                <p className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1.5 font-bold animate-pulse">
                  <Gift className="w-3.5 h-3.5" />
                  <span>今天寿星: <strong>{bdayObj.name}</strong>生日！ ({bdayObj.isLunar ? '农历 ' + (bdayObj.lunarFormatted || '') : '阳历生日'})</span>
                </p>
              )}
              {hsObj.length > 0 && (
                <div className="bg-yellow-50/50 px-2.5 py-1 rounded-lg border border-yellow-100 text-yellow-800 space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span>该日高光时刻数: {hsObj.length}个</span>
                  </p>
                  {hsObj.map((h, i) => (
                    <p key={i} className="text-[11px] text-slate-600 truncate pl-5">“{h.title}”</p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Calendar Legend */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-rose-50 border border-rose-200 rounded-lg shrink-0" />
          <span>今日 (5-31)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs shrink-0">🎂</span>
          <span>寿星生日</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 inline-block bg-blue-400 rounded-full shrink-0 animate-pulse" />
          <span>待办日程项</span>
        </div>
      </div>
    </div>
  );
}
