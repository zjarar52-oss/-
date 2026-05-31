import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarProps {
  events: CalendarEvent[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
}

export default function Calendar({ events, selectedDate, onSelectDate }: CalendarProps) {
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

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            {year}年 {monthNames[month]}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-650 transition-all hover:scale-105"
            title="上个月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(2026, 4, 31))}
            className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
            title="回到2026年5月"
          >
            今天
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-650 transition-all hover:scale-105"
            title="下个月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Titles */}
      <div className="grid grid-cols-7 text-center gap-2 mb-4">
        {weekDays.map((day, idx) => (
          <span 
            key={idx} 
            className={`text-xs font-black uppercase tracking-wider py-1 ${
              idx === 0 || idx === 6 ? 'text-rose-450' : 'text-slate-300'
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

          return (
            <button
              key={`day-${day}`}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square relative rounded-2xl flex flex-col p-2 transition-all border ${
                isSelected
                  ? 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-400 text-blue-700 font-bold scale-105 shadow-sm'
                  : currentIsToday
                    ? 'bg-rose-50 border-rose-200 text-rose-600 font-extrabold'
                    : 'hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-sm font-semibold">{day}</span>
              
              {/* Event indicators */}
              {currentDayHasEvents && (
                <div className="mt-auto flex flex-wrap gap-1">
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
                </div>
              )}

              {/* Reference today indicator label if today is May 31 */}
              {currentIsToday && !isSelected && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 inline-block bg-rose-50 border border-rose-250 rounded-lg" />
          <span>当前系统今日 (2026-05-31)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 inline-block bg-blue-400 rounded-full" />
          <span>有待办事件</span>
        </div>
      </div>
    </div>
  );
}
