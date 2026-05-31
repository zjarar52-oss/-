// ==================== 状态管理 ====================
const AppState = {
    // 语音按钮状态机
    VoiceState: {
        IDLE: 'idle',
        LISTENING: 'listening',
        THINKING: 'thinking',
        SUCCESS: 'success',
        ERROR: 'error'
    },
    
    // 当前状态
    currentVoiceState: 'idle',
    
    // 数据
    events: [],
    memories: [],
    apiKey: localStorage.getItem('deepseek_api_key') || '',
    
    // UI 状态
    currentTab: 'schedule',
    selectedEventId: null,
    
    // 日历状态
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    selectedDate: new Date()
};

// ==================== DOM 元素缓存 ====================
const DOM = {
    // API 面板
    apiPanel: document.getElementById('apiPanel'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
    closeApiPanel: document.getElementById('closeApiPanel'),
    
    // 头部
    todayDate: document.getElementById('todayDate'),
    greeting: document.getElementById('greeting'),
    settingsBtn: document.getElementById('settingsBtn'),
    apiStatus: document.getElementById('apiStatus'),
    
    // 语音区域
    voiceBtn: document.getElementById('voiceBtn'),
    voiceStatus: document.getElementById('voiceStatus'),
    rippleContainer: document.getElementById('rippleContainer'),
    recognitionResult: document.getElementById('recognitionResult'),
    
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    scheduleContent: document.getElementById('scheduleContent'),
    memoryContent: document.getElementById('memoryContent'),
    
    // 日历模块
    calendarTitle: document.getElementById('calendarTitle'),
    calendarDays: document.getElementById('calendarDays'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    selectedDateTitle: document.getElementById('selectedDateTitle'),
    eventCount: document.getElementById('eventCount'),
    scheduleList: document.getElementById('scheduleList'),
    
    // 记忆模块
    totalMemories: document.getElementById('totalMemories'),
    thisMonthMemories: document.getElementById('thisMonthMemories'),
    memoryList: document.getElementById('memoryList'),
    
    // Modal
    eventModal: document.getElementById('eventModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    deleteEventBtn: document.getElementById('deleteEventBtn'),
    closeModal: document.getElementById('closeModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ==================== 语音识别实例 ====================
let recognition = null;

// ==================== 初始化 ====================
function init() {
    // 加载数据
    loadData();
    
    // 初始化 UI
    renderHeader();
    updateApiStatus();
    renderCalendar();
    renderScheduleList();
    renderMemoryList();
    
    // 绑定事件
    bindEvents();
    
    // 检查是否需要显示 API 面板
    if (!AppState.apiKey) {
        showApiPanel();
    }
}

// ==================== 事件绑定 ====================
function bindEvents() {
    // API 面板
    DOM.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
    DOM.closeApiPanel.addEventListener('click', hideApiPanel);
    DOM.settingsBtn.addEventListener('click', showApiPanel);
    
    // 语音按钮
    DOM.voiceBtn.addEventListener('click', handleVoiceClick);
    
    // Tabs 切换
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 日历导航
    DOM.prevMonth.addEventListener('click', () => {
        AppState.calendarMonth--;
        if (AppState.calendarMonth < 0) {
            AppState.calendarMonth = 11;
            AppState.calendarYear--;
        }
        renderCalendar();
    });
    
    DOM.nextMonth.addEventListener('click', () => {
        AppState.calendarMonth++;
        if (AppState.calendarMonth > 11) {
            AppState.calendarMonth = 0;
            AppState.calendarYear++;
        }
        renderCalendar();
    });
    
    // Modal
    DOM.closeModal.addEventListener('click', hideModal);
    DOM.closeModalBtn.addEventListener('click', hideModal);
    DOM.deleteEventBtn.addEventListener('click', handleDeleteEvent);
    DOM.eventModal.querySelector('.modal-backdrop').addEventListener('click', hideModal);
}

// ==================== API Key 管理 ====================
function showApiPanel() {
    DOM.apiPanel.classList.add('show');
}

function hideApiPanel() {
    DOM.apiPanel.classList.remove('show');
}

function handleSaveApiKey() {
    const key = DOM.apiKeyInput.value.trim();
    
    if (!key) {
        showToast('请输入 API Key', 'warning');
        return;
    }
    
    if (!key.startsWith('sk-')) {
        showToast('API Key 格式不正确', 'error');
        return;
    }
    
    AppState.apiKey = key;
    localStorage.setItem('deepseek_api_key', key);
    DOM.apiKeyInput.value = '';
    hideApiPanel();
    updateApiStatus();
    showToast('API Key 已保存', 'success');
}

function updateApiStatus() {
    if (AppState.apiKey) {
        DOM.apiStatus.classList.add('connected');
        DOM.apiStatus.title = 'API Key 已配置';
    } else {
        DOM.apiStatus.classList.remove('connected');
        DOM.apiStatus.title = '未配置 API Key';
    }
}

// ==================== 头部渲染 ====================
function renderHeader() {
    const now = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    DOM.todayDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`;
    
    // 根据时间段生成问候语
    const hour = now.getHours();
    let greetingText = '';
    
    if (hour < 6) {
        greetingText = '夜深了，注意休息';
    } else if (hour < 9) {
        greetingText = '早上好，今天适合专注';
    } else if (hour < 12) {
        greetingText = '上午好，保持高效';
    } else if (hour < 14) {
        greetingText = '中午好，记得午休';
    } else if (hour < 18) {
        greetingText = '下午好，继续加油';
    } else if (hour < 22) {
        greetingText = '晚上好，适当放松';
    } else {
        greetingText = '夜深了，早点休息';
    }
    
    DOM.greeting.textContent = greetingText;
}

// ==================== 日历渲染 ====================
function renderCalendar() {
    const year = AppState.calendarYear;
    const month = AppState.calendarMonth;
    
    // 更新标题
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                        '七月', '八月', '九月', '十月', '十一月', '十二月'];
    DOM.calendarTitle.textContent = `${year}年 ${monthNames[month]}`;
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取当月第一天是星期几
    const startWeekday = firstDay.getDay();
    
    // 获取上月最后几天
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // 清空日历
    DOM.calendarDays.innerHTML = '';
    
    const today = new Date();
    const todayStr = formatDate(today);
    const selectedStr = formatDate(AppState.selectedDate);
    
    // 渲染上月日期
    for (let i = startWeekday - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayEl = createDayElement(day, true);
        DOM.calendarDays.appendChild(dayEl);
    }
    
    // 渲染当月日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = formatDate(new Date(year, month, day));
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedStr;
        const dayEvents = AppState.events.filter(e => e.date === dateStr);
        const dayMemories = AppState.memories.filter(m => m.date === dateStr);
        
        const dayEl = createDayElement(day, false, isToday, isSelected, dayEvents, dayMemories, dateStr);
        DOM.calendarDays.appendChild(dayEl);
    }
    
    // 渲染下月日期
    const totalCells = DOM.calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6行 x 7列 = 42
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = createDayElement(day, true);
        DOM.calendarDays.appendChild(dayEl);
    }
}

function createDayElement(day, isOtherMonth, isToday = false, isSelected = false, events = [], memories = [], dateStr = '') {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    // 日期数字
    const dayNum = document.createElement('span');
    dayNum.textContent = day;
    dayEl.appendChild(dayNum);
    
    if (isOtherMonth) {
        dayEl.classList.add('other-month');
    } else {
        if (isToday) dayEl.classList.add('today');
        if (isSelected) dayEl.classList.add('selected');
        
        // 添加事件标记
        if (events.length > 0 || memories.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'day-events';
            
            // 日程标记点（最多显示3个）
            const maxDots = Math.min(events.length, 3);
            for (let i = 0; i < maxDots; i++) {
                const dot = document.createElement('span');
                dot.className = 'event-dot';
                eventsContainer.appendChild(dot);
            }
            
            // 记忆标记点
            if (memories.length > 0) {
                const dot = document.createElement('span');
                dot.className = 'event-dot memory';
                eventsContainer.appendChild(dot);
            }
            
            dayEl.appendChild(eventsContainer);
            
            // 如果事件数量超过3个，显示数字
            if (events.length > 3 || (events.length > 0 && memories.length > 0)) {
                const badge = document.createElement('span');
                badge.className = 'event-count-badge';
                badge.textContent = events.length + memories.length;
                dayEl.appendChild(badge);
            }
        }
        
        // 点击选择日期
        dayEl.addEventListener('click', () => {
            AppState.selectedDate = new Date(dateStr);
            renderCalendar();
            renderScheduleList();
        });
    }
    
    return dayEl;
}

// ==================== 语音状态机 ====================
function setVoiceState(state) {
    const btn = DOM.voiceBtn;
    const statusText = DOM.voiceStatus.querySelector('.status-text');
    const rippleContainer = DOM.rippleContainer;
    
    // 移除所有状态类
    btn.classList.remove('listening', 'thinking', 'success', 'error');
    rippleContainer.classList.remove('active');
    
    AppState.currentVoiceState = state;
    
    switch (state) {
        case AppState.VoiceState.IDLE:
            statusText.textContent = '点击开始语音输入';
            break;
            
        case AppState.VoiceState.LISTENING:
            btn.classList.add('listening');
            rippleContainer.classList.add('active');
            statusText.textContent = '正在聆听...';
            break;
            
        case AppState.VoiceState.THINKING:
            btn.classList.add('thinking');
            statusText.textContent = 'AI 正在理解...';
            break;
            
        case AppState.VoiceState.SUCCESS:
            btn.classList.add('success');
            statusText.textContent = '完成！';
            setTimeout(() => setVoiceState(AppState.VoiceState.IDLE), 1500);
            break;
            
        case AppState.VoiceState.ERROR:
            btn.classList.add('error');
            statusText.textContent = '出错了，请重试';
            setTimeout(() => setVoiceState(AppState.VoiceState.IDLE), 2000);
            break;
    }
}

// ==================== 语音识别 ====================
function handleVoiceClick() {
    if (!AppState.apiKey) {
        showApiPanel();
        showToast('请先配置 API Key', 'warning');
        return;
    }
    
    if (AppState.currentVoiceState === AppState.VoiceState.IDLE) {
        startRecognition();
    } else if (AppState.currentVoiceState === AppState.VoiceState.LISTENING) {
        stopRecognition();
    }
}

function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('您的浏览器不支持语音识别', 'error');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';
    
    recognition.onstart = () => {
        setVoiceState(AppState.VoiceState.LISTENING);
        showRecognitionPlaceholder('正在聆听，请说话...');
    };
    
    recognition.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        showRecognitionText(text);
        setVoiceState(AppState.VoiceState.THINKING);
        
        try {
            const result = await parseVoiceText(text);
            handleParsedResult(result, text);
        } catch (error) {
            console.error('解析错误:', error);
            setVoiceState(AppState.VoiceState.ERROR);
            showRecognitionError(error.message);
        }
    };
    
    recognition.onerror = (event) => {
        let errorMsg = '语音识别失败';
        
        switch (event.error) {
            case 'no-speech':
                errorMsg = '未检测到语音';
                break;
            case 'audio-capture':
                errorMsg = '无法访问麦克风';
                break;
            case 'not-allowed':
                errorMsg = '请允许访问麦克风';
                break;
            case 'network':
                errorMsg = '网络连接失败';
                break;
        }
        
        setVoiceState(AppState.VoiceState.ERROR);
        showRecognitionError(errorMsg);
        showToast(errorMsg, 'error');
    };
    
    recognition.onend = () => {
        if (AppState.currentVoiceState === AppState.VoiceState.LISTENING) {
            setVoiceState(AppState.VoiceState.IDLE);
        }
    };
    
    return true;
}

function startRecognition() {
    if (!recognition && !initSpeechRecognition()) {
        return;
    }
    
    try {
        recognition.start();
    } catch (e) {
        console.error('启动语音识别失败:', e);
        showToast('启动语音识别失败', 'error');
    }
}

function stopRecognition() {
    if (recognition) {
        recognition.stop();
    }
}

// ==================== DeepSeek API 解析 ====================
async function parseVoiceText(text) {
    const today = new Date();
    const todayStr = formatDate(today);
    const tomorrowStr = formatDate(addDays(today, 1));
    const dayAfterTomorrowStr = formatDate(addDays(today, 2));
    
    const systemPrompt = `你是一个智能日历助手，负责解析用户的语音输入并提取日程或记忆信息。

当前日期时间：${todayStr} ${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}
明天：${tomorrowStr}
后天：${dayAfterTomorrowStr}

请分析用户输入，识别以下内容：

1. 意图类型：
   - add: 新增日程（未来的计划、会议、提醒等）
   - delete: 删除日程
   - query: 查询日程
   - memory: 记录回忆、高光时刻、重要事件（过去的成就、纪念日、拿到offer等）
   - unknown: 无法识别

2. 事件名称/标题（必填，简洁明了）

3. 日期（YYYY-MM-DD 格式）
   - add 类型：默认为今天
   - memory 类型：可以是过去日期，默认为今天
   - query 类型：默认为今天

4. 时间（HH:MM 24小时制格式，可选）

用户输入示例：
- "明天下午三点面试" → add, 面试, 明天日期, 15:00
- "后天10点开会" → add, 开会, 后天日期, 10:00
- "查看今天日程" → query, 空, 今天日期, 空
- "删除面试" → delete, 面试, 空, 空
- "今天有什么安排" → query, 空, 今天日期, 空
- "记录昨天拿到offer" → memory, 拿到offer, 昨天日期, 空
- "上个月升职了" → memory, 升职了, 上个月某天, 空

请严格返回 JSON 格式，不要包含任何其他内容：
{
    "type": "add | delete | query | memory | unknown",
    "title": "事件名称",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "message": "无法识别时的提示信息"
}`;

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.1,
                max_tokens: 200
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('API Key 无效或已过期');
            }
            throw new Error(`API 请求失败 (${response.status})`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // 提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI 返回格式异常');
        }
        
        return JSON.parse(jsonMatch[0]);
        
    } catch (error) {
        console.error('DeepSeek API 调用错误:', error);
        throw error;
    }
}

// ==================== 处理解析结果 ====================
function handleParsedResult(result, originalText) {
    if (result.type === 'unknown') {
        setVoiceState(AppState.VoiceState.ERROR);
        showRecognitionError(result.message || '无法识别，请重新说一遍');
        showToast(result.message || '无法识别', 'warning');
        return;
    }
    
    let actionHtml = '';
    
    switch (result.type) {
        case 'add':
            if (!result.title) {
                showRecognitionError('请说明事件名称');
                setVoiceState(AppState.VoiceState.ERROR);
                return;
            }
            const addDate = result.date || formatDate(new Date());
            addEvent({
                title: result.title,
                date: addDate,
                time: result.time || '09:00'
            });
            // 选中新添加的日期
            AppState.selectedDate = new Date(addDate);
            renderCalendar();
            actionHtml = createResultAction('add', '添加日程', result.title, `${formatDisplayDate(addDate)} ${result.time || '09:00'}`);
            break;
            
        case 'delete':
            if (!result.title) {
                showRecognitionError('请说明要删除的事件');
                setVoiceState(AppState.VoiceState.ERROR);
                return;
            }
            const deleted = deleteEventByTitle(result.title);
            if (deleted) {
                actionHtml = createResultAction('delete', '已删除', result.title, '日程已移除');
            } else {
                showRecognitionError(`未找到日程：${result.title}`);
                setVoiceState(AppState.VoiceState.ERROR);
                return;
            }
            break;
            
        case 'query':
            const queryDate = result.date || formatDate(new Date());
            AppState.selectedDate = new Date(queryDate);
            renderCalendar();
            const events = queryEvents(queryDate);
            if (events.length === 0) {
                actionHtml = createResultAction('query', '查询结果', formatDisplayDate(queryDate), '暂无日程');
            } else {
                const eventList = events.map(e => `${e.time} ${e.title}`).join('、');
                actionHtml = createResultAction('query', formatDisplayDate(queryDate), `${events.length} 个日程`, eventList);
            }
            // 切换到日程 tab
            switchTab('schedule');
            break;
            
        case 'memory':
            if (!result.title) {
                showRecognitionError('请说明记录内容');
                setVoiceState(AppState.VoiceState.ERROR);
                return;
            }
            addMemory({
                title: result.title,
                date: result.date || formatDate(new Date())
            });
            actionHtml = createResultAction('add', '记录记忆', result.title, formatDisplayDate(result.date));
            // 切换到记忆 tab
            switchTab('memory');
            break;
    }
    
    setVoiceState(AppState.VoiceState.SUCCESS);
    showRecognitionSuccess(originalText, actionHtml);
}

function createResultAction(type, title, subtitle, detail) {
    const icons = {
        add: '📅',
        delete: '🗑️',
        query: '🔍'
    };
    
    return `
        <div class="result-action">
            <div class="result-action-icon ${type}">${icons[type]}</div>
            <div class="result-action-text">
                <div class="result-action-title">${title}</div>
                <div class="result-action-detail">${subtitle}${detail ? ' · ' + detail : ''}</div>
            </div>
        </div>
    `;
}

// ==================== 识别结果展示 ====================
function showRecognitionPlaceholder(text) {
    DOM.recognitionResult.innerHTML = `
        <div class="result-placeholder">
            <div class="placeholder-icon">🎤</div>
            <div class="placeholder-text">${text}</div>
        </div>
    `;
}

function showRecognitionText(text) {
    DOM.recognitionResult.innerHTML = `
        <div class="result-content">
            <div class="result-text">"${text}"</div>
            <div style="color: var(--text-muted); font-size: 14px;">AI 正在理解...</div>
        </div>
    `;
}

function showRecognitionSuccess(text, actionHtml) {
    DOM.recognitionResult.innerHTML = `
        <div class="result-content">
            <div class="result-text">"${text}"</div>
            ${actionHtml}
        </div>
    `;
}

function showRecognitionError(message) {
    DOM.recognitionResult.innerHTML = `
        <div class="result-placeholder">
            <div class="placeholder-icon">😔</div>
            <div class="placeholder-text" style="color: var(--danger-color);">${message}</div>
        </div>
    `;
}

// ==================== 数据管理 ====================
function loadData() {
    const stored = localStorage.getItem('calendar_events');
    const events = stored ? JSON.parse(stored) : [];
    
    AppState.events = events.filter(e => e.type !== 'memory');
    AppState.memories = events.filter(e => e.type === 'memory');
}

function saveData() {
    const allEvents = [...AppState.events, ...AppState.memories];
    localStorage.setItem('calendar_events', JSON.stringify(allEvents));
}

// ==================== 日程管理 ====================
function addEvent(event) {
    const newEvent = {
        id: generateId(),
        type: 'schedule',
        title: event.title,
        date: event.date,
        time: event.time || '09:00',
        createdAt: new Date().toISOString()
    };
    
    AppState.events.push(newEvent);
    saveData();
    renderCalendar();
    renderScheduleList();
    showToast(`已添加：${event.title}`, 'success');
}

function deleteEvent(id) {
    AppState.events = AppState.events.filter(e => e.id !== id);
    saveData();
    renderCalendar();
    renderScheduleList();
    showToast('日程已删除', 'success');
}

function deleteEventByTitle(title) {
    const index = AppState.events.findIndex(e => 
        e.title.includes(title) || title.includes(e.title)
    );
    
    if (index !== -1) {
        const deleted = AppState.events.splice(index, 1)[0];
        saveData();
        renderCalendar();
        renderScheduleList();
        return deleted;
    }
    return null;
}

function queryEvents(date) {
    return AppState.events.filter(e => e.date === date);
}

// ==================== 记忆管理 ====================
function addMemory(memory) {
    const newMemory = {
        id: generateId(),
        type: 'memory',
        title: memory.title,
        date: memory.date,
        createdAt: new Date().toISOString()
    };
    
    AppState.memories.push(newMemory);
    saveData();
    renderCalendar();
    renderMemoryList();
    showToast(`已记录：${memory.title}`, 'success');
}

function deleteMemory(id) {
    AppState.memories = AppState.memories.filter(m => m.id !== id);
    saveData();
    renderCalendar();
    renderMemoryList();
    showToast('记忆已删除', 'success');
}

// ==================== 渲染日程列表 ====================
function renderScheduleList() {
    const selectedDateStr = formatDate(AppState.selectedDate);
    const today = formatDate(new Date());
    const isToday = selectedDateStr === today;
    
    // 更新标题
    if (isToday) {
        DOM.selectedDateTitle.textContent = '今日日程';
    } else {
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const date = AppState.selectedDate;
        DOM.selectedDateTitle.textContent = `${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
    }
    
    // 获取选中日期的日程
    const dayEvents = AppState.events.filter(e => e.date === selectedDateStr);
    
    // 更新事件数量
    if (dayEvents.length > 0) {
        DOM.eventCount.textContent = `${dayEvents.length} 项日程`;
        DOM.eventCount.style.display = 'block';
    } else {
        DOM.eventCount.style.display = 'none';
    }
    
    // 按时间排序
    dayEvents.sort((a, b) => a.time.localeCompare(b.time));
    
    if (dayEvents.length === 0) {
        DOM.scheduleList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-text">暂无日程安排</div>
                <div class="empty-hint">点击麦克风开始添加</div>
            </div>
        `;
        return;
    }
    
    DOM.scheduleList.innerHTML = dayEvents.map(event => `
        <div class="event-card" onclick="showEventDetail('${event.id}')">
            <div class="event-time-badge">
                <div class="event-time-text">${event.time}</div>
            </div>
            <div class="event-content">
                <div class="event-title">${event.title}</div>
                <div class="event-date-text">${formatDisplayDate(event.date)}</div>
            </div>
            <button class="event-delete-btn" onclick="event.stopPropagation(); deleteEvent('${event.id}')" title="删除">×</button>
        </div>
    `).join('');
}

// ==================== 渲染记忆列表 ====================
function renderMemoryList() {
    // 更新统计
    const thisMonth = new Date().toISOString().slice(0, 7);
    DOM.totalMemories.textContent = AppState.memories.length;
    DOM.thisMonthMemories.textContent = AppState.memories.filter(m => m.date.startsWith(thisMonth)).length;
    
    if (AppState.memories.length === 0) {
        DOM.memoryList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✨</div>
                <div class="empty-text">开始记录你的高光时刻</div>
                <div class="empty-hint">说"记录今天拿到offer"</div>
            </div>
        `;
        return;
    }
    
    // 按日期倒序
    const sortedMemories = [...AppState.memories].sort((a, b) => b.date.localeCompare(a.date));
    
    DOM.memoryList.innerHTML = sortedMemories.map(memory => `
        <div class="memory-card">
            <div class="memory-card-header">
                <span class="memory-date-badge">${formatDisplayDate(memory.date)}</span>
                <button class="memory-delete-btn" onclick="deleteMemory('${memory.id}')" title="删除">×</button>
            </div>
            <div class="memory-title">${memory.title}</div>
        </div>
    `).join('');
}

// ==================== Tab 切换 ====================
function switchTab(tab) {
    AppState.currentTab = tab;
    
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    DOM.scheduleContent.classList.toggle('active', tab === 'schedule');
    DOM.memoryContent.classList.toggle('active', tab === 'memory');
    
    if (tab === 'schedule') {
        renderCalendar();
        renderScheduleList();
    } else {
        renderMemoryList();
    }
}

// ==================== Modal ====================
function showEventDetail(id) {
    const event = AppState.events.find(e => e.id === id);
    if (!event) return;
    
    AppState.selectedEventId = id;
    
    DOM.modalTitle.textContent = '日程详情';
    DOM.modalBody.innerHTML = `
        <p><strong>事件</strong></p>
        <p style="font-size: 18px; color: var(--text-primary); margin-bottom: 16px;">${event.title}</p>
        <p><strong>日期</strong></p>
        <p style="margin-bottom: 16px;">${formatFullDate(event.date)}</p>
        <p><strong>时间</strong></p>
        <p>${event.time}</p>
    `;
    
    DOM.eventModal.classList.add('show');
}

function hideModal() {
    DOM.eventModal.classList.remove('show');
    AppState.selectedEventId = null;
}

function handleDeleteEvent() {
    if (AppState.selectedEventId) {
        deleteEvent(AppState.selectedEventId);
        hideModal();
    }
}

// ==================== Toast 提示 ====================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ==================== 工具函数 ====================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (dateStr === formatDate(today)) return '今天';
    if (dateStr === formatDate(tomorrow)) return '明天';
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatFullDate(dateStr) {
    const date = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekDays[date.getDay()]}`;
}

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', init);
