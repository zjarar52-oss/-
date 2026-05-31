/**
 * Ultra-simple responsive Lunar calendar calendar calculations for solar date presets
 */
export interface Birthday {
  id: string;
  name: string;
  solarMonth: number;
  solarDay: number;
  isLunar: boolean;
  lunarFormatted?: string;
}

export const PRESET_BIRTHDAYS: Birthday[] = [
  { id: 'b-1', name: '朋友阿明', solarMonth: 5, solarDay: 12, isLunar: true, lunarFormatted: '四月廿六' },
  { id: 'b-2', name: '朋友小红', solarMonth: 6, solarDay: 15, isLunar: false },
  { id: 'b-3', name: '同学李华', solarMonth: 11, solarDay: 11, isLunar: false },
  { id: 'b-4', name: '朋友小建', solarMonth: 5, solarDay: 31, isLunar: true, lunarFormatted: '四月十五' },
  { id: 'b-5', name: '家人生日', solarMonth: 10, solarDay: 1, isLunar: false }
];

/**
 * Super simple Lunar day translation mapping
 */
export function getLunarString(month: number, day: number): string {
  const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const lunarDays = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ];
  const mIndex = (month - 1) % 12;
  const dIndex = (day - 1) % 30;
  return `农历${lunarMonths[mIndex]}${lunarDays[dIndex]}`;
}
