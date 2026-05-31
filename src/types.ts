export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;  // HH:MM (24-hour style) or ""
  createdAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'gemini';
  text: string;
}

export interface ParseResult {
  action: 'add' | 'query' | 'delete';
  title: string;
  date: string;
  time: string;
}
