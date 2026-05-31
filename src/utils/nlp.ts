import { ParseResult } from '../types';

/**
 * Clean and parse relative Chinese numbers to integer English string
 */
function chineseToNumber(ch: string): number {
  const digits: { [key: string]: number } = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  };
  
  if (digits[ch] !== undefined) return digits[ch];
  
  // handle numbers like "十一", "十二", "十五" etc.
  if (ch.startsWith('十') && ch.length > 1) {
    const unit = digits[ch[1]] || 0;
    return 10 + unit;
  }
  
  const parsed = parseInt(ch, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Local Rule-based NLP text parser to run completely in browser
 * @param text Natural language voice input in Chinese
 * @param referenceDate Default date reference (e.g., '2026-05-31')
 */
export function parseVoiceText(text: string, referenceDate: string = '2026-05-31'): ParseResult | { type: 'unknown'; message: string } {
  // Let's standardise simple punctuation and trim
  const cleanText = text.trim().replace(/[。，？！,.?!]/g, '');
  if (!cleanText) {
    return {
      type: 'unknown',
      message: '无法识别，语音指令为空。'
    };
  }

  // Determine intent category (Action)
  let action: 'add' | 'query' | 'delete' = 'add';
  const deleteKeywords = ['删除', '取消', '清除', '删掉', '撤销', '不要了'];
  const queryKeywords = ['查看', '查询', '安排', '日程', '有什么', '列出', '看看'];

  const hasDelete = deleteKeywords.some(keyword => cleanText.includes(keyword));
  const hasQuery = queryKeywords.some(keyword => cleanText.includes(keyword)) && !cleanText.includes('面试') && !cleanText.includes('开会') && !cleanText.includes('吃饭'); // guard for compound sentences

  if (hasDelete) {
    action = 'delete';
  } else if (hasQuery) {
    action = 'query';
  }

  // Parse Date
  let date = referenceDate; // Default to reference today
  const refDateObj = new Date(referenceDate);

  if (cleanText.includes('今天')) {
    date = referenceDate;
  } else if (cleanText.includes('明天')) {
    const tomorrow = new Date(refDateObj);
    tomorrow.setDate(refDateObj.getDate() + 1);
    date = tomorrow.toISOString().split('T')[0];
  } else if (cleanText.includes('后天')) {
    const dayAfter = new Date(refDateObj);
    dayAfter.setDate(refDateObj.getDate() + 2);
    date = dayAfter.toISOString().split('T')[0];
  } else {
    // Check if there is explicit Month-Day, for example "6月1日", "06-01"
    const explicitDateReg = /(\d{1,2})月(\d{1,2})日?/;
    const match = cleanText.match(explicitDateReg);
    if (match) {
      const month = String(parseInt(match[1], 10)).padStart(2, '0');
      const day = String(parseInt(match[2], 10)).padStart(2, '0');
      date = `${refDateObj.getFullYear()}-${month}-${day}`;
    }
  }

  // Parse Time
  let time = '';
  let hour = -1;
  let minute = 0;

  // 1. Check afternoon/morning bias modifiers
  let hourModifier = 0; // 0 for default 24h, 12 for afternoon
  if (cleanText.includes('下午') || cleanText.includes('晚上') || cleanText.includes('下半天') || cleanText.includes('pm') || cleanText.includes('PM')) {
    hourModifier = 12;
  } else if (cleanText.includes('上午') || cleanText.includes('早上') || cleanText.includes('凌晨') || cleanText.includes('am') || cleanText.includes('AM')) {
    hourModifier = 0;
  }

  // Check matching like "下午三点", "下午3点" or "10点"
  // Chinese hour matching: ([一二三四五六七八九十两\d]+)\s*点
  const timeRegCh = /([一二三四五六七八九十两\d]+)\s*点/;
  const matchCh = cleanText.match(timeRegCh);
  if (matchCh) {
    const hourVal = chineseToNumber(matchCh[1]);
    if (hourVal > 0 && hourVal <= 12) {
      hour = hourVal + (hourVal === 12 ? (hourModifier === 12 ? 0 : -12) : hourModifier); // adjust for 12 PM being 12:00, 12 AM being 00:00
    } else {
      hour = hourVal;
    }
    
    // Check half hour "半", "10点半", "下午三点半"
    if (cleanText.includes(matchCh[0] + '半')) {
      minute = 30;
    } else {
      // Check explicit minutes like "点30", "点十五分", "点20分"
      const minReg = new RegExp(matchCh[0] + '([一二三四五六七八九十\d]+)分?');
      const matchMin = cleanText.match(minReg);
      if (matchMin) {
        minute = chineseToNumber(matchMin[1]);
      }
    }
  } else {
    // Check hh:mm format, e.g. "15:00", "10:30"
    const clockReg = /(\d{1,2}):(\d{2})/;
    const matchClock = cleanText.match(clockReg);
    if (matchClock) {
      hour = parseInt(matchClock[1], 10);
      minute = parseInt(matchClock[2], 10);
    }
  }

  if (hour !== -1) {
    time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  // Extract Title
  // Strip out action commands, timestamps, dates relative keywords to get clean titles.
  let title = cleanText;

  // Words to strip out for title
  const stripWords = [
    '删除', '取消', '清除', '查看', '查询', '演示', '模拟', '新增', '添加',
    '今天', '明天', '后天',
    '下午', '上午', '晚上', '早上', '凌晨',
    '时分', '分钟', '日程', '安排'
  ];

  // Remove the timestamp match portion (e.g. "三点", "10点", "3点半")
  if (matchCh) {
    title = title.replace(matchCh[0], '');
    title = title.replace('半', '');
  }
  
  // Strip clock pattern
  const clockReg2 = /\d{1,2}:\d{2}/;
  title = title.replace(clockReg2, '');

  stripWords.forEach(word => {
    title = title.split(word).join('');
  });

  // Strip residual "月", "日" matching
  title = title.replace(/\d{1,2}月\d{1,2}日?/, '');
  title = title.trim();

  // If title is parsed empty, try smart default matching
  if (!title && action === 'add') {
    title = '新日程';
  }

  return {
    action,
    title,
    date,
    time
  } as ParseResult;
}
