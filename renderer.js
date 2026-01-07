// 渲染进程 JavaScript
const { ipcRenderer } = require('electron');

// 模拟数据
const scheduleData = {
    '2025-12-14': [
        { time: '08:00-08:45', subject: '语文', classroom: '301' },
        { time: '09:00-09:45', subject: '数学', classroom: '302' },
        { time: '10:10-10:55', subject: '英语', classroom: '303' },
        { time: '11:10-11:55', subject: '物理', classroom: '304' },
        { time: '14:00-14:45', subject: '化学', classroom: '305' },
        { time: '15:00-15:45', subject: '生物', classroom: '306' }
    ],
    '2025-12-15': [
        { time: '08:00-08:45', subject: '历史', classroom: '301' },
        { time: '09:00-09:45', subject: '地理', classroom: '302' },
        { time: '10:10-10:55', subject: '政治', classroom: '303' }
    ]
};

const weatherData = {
    temperature: '24℃',
    description: '晴',
    city: '上海市',
    wind: '东南风 3级',
    humidity: '湿度 65%',
    icon: 'fa-sun'
};

// DOM 元素
const elements = {
    // 窗口控制
    minimizeBtn: document.getElementById('minimize-btn'),
    maximizeBtn: document.getElementById('maximize-btn'),
    closeBtn: document.getElementById('close-btn'),
    alwaysOnTopCheck: document.getElementById('always-on-top'),
    
    // 天气
    temperature: document.getElementById('temperature'),
    weatherDesc: document.getElementById('weather-desc'),
    city: document.getElementById('city'),
    wind: document.getElementById('wind'),
    humidity: document.getElementById('humidity'),
    weatherIcon: document.getElementById('weather-icon'),
    
    // 课程表
    scheduleDate: document.getElementById('schedule-date'),
    scheduleTable: document.getElementById('schedule-table').querySelector('tbody'),
    prevDayBtn: document.getElementById('prev-day'),
    nextDayBtn: document.getElementById('next-day'),
    
    // 倒计时
    countdownHours: document.getElementById('countdown-hours'),
    countdownMinutes: document.getElementById('countdown-minutes'),
    countdownSeconds: document.getElementById('countdown-seconds'),
    nextEvent: document.getElementById('next-event'),
    eventTime: document.getElementById('event-time'),
    
    // 当前活动
    currentActivityName: document.getElementById('current-activity-name'),
    currentActivityTime: document.getElementById('current-activity-time'),
    activityProgressFill: document.getElementById('activity-progress-fill'),
    activityProgressText: document.getElementById('activity-progress-text'),
    
    // 通知
    notificationList: document.getElementById('notification-list'),
    clearNotificationsBtn: document.getElementById('clear-notifications'),
    
    // 控制按钮
    settingsBtn: document.getElementById('settings-btn'),
    refreshBtn: document.getElementById('refresh-btn')
};

// 当前日期
let currentDate = new Date();
let currentDateStr = formatDate(currentDate);

// 初始化
function init() {
    // 窗口控制
    elements.minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('window-minimize');
    });
    
    elements.maximizeBtn.addEventListener('click', () => {
        ipcRenderer.send('window-toggle-maximize');
    });
    
    elements.closeBtn.addEventListener('click', () => {
        ipcRenderer.send('window-close');
    });
    
    elements.alwaysOnTopCheck.addEventListener('change', (e) => {
        ipcRenderer.send('set-always-on-top', e.target.checked);
    });
    
    // 课程表导航
    elements.prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateSchedule();
    });
    
    elements.nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateSchedule();
    });
    
    // 通知
    elements.clearNotificationsBtn.addEventListener('click', clearNotifications);
    
    // 控制按钮
    elements.settingsBtn.addEventListener('click', () => {
        showNotification('设置功能开发中...');
    });
    
    elements.refreshBtn.addEventListener('click', () => {
        showNotification('数据已刷新');
        updateWeather();
        updateSchedule();
        updateCountdown();
    });
    
    // 添加自动隐藏选项的切换监听
    document.getElementById('always-on-top').addEventListener('change', (e) => {
        ipcRenderer.send('set-always-on-top', e.target.checked);
    });
    
    // 初始更新
    updateWeather();
    updateSchedule();
    updateCountdown();
    updateCurrentActivity();
    
    // 添加示例通知
    addNotification('系统', '课程表小工具已启动', new Date());
    addNotification('提醒', '下一节课：数学，14:00开始', new Date());
    
    // 开始定时器
    setInterval(updateCountdown, 1000);
    setInterval(updateCurrentActivity, 60000); // 每分钟更新一次当前活动
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取星期几
function getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekdays[date.getDay()];
}

// 更新天气
function updateWeather() {
    // 模拟 API 调用
    elements.temperature.textContent = weatherData.temperature;
    elements.weatherDesc.textContent = weatherData.description;
    elements.city.textContent = weatherData.city;
    elements.wind.textContent = weatherData.wind;
    elements.humidity.textContent = weatherData.humidity;
    elements.weatherIcon.innerHTML = `<i class="fas ${weatherData.icon}"></i>`;
}

// 更新课程表
function updateSchedule() {
    currentDateStr = formatDate(currentDate);
    const dateDisplay = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日 ${getWeekday(currentDate)}`;
    elements.scheduleDate.textContent = dateDisplay;
    
    const schedule = scheduleData[currentDateStr] || [];
    elements.scheduleTable.innerHTML = '';
    
    if (schedule.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center; color: #aaa;">今日无课程</td>`;
        elements.scheduleTable.appendChild(row);
        return;
    }
    
    schedule.forEach(lesson => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lesson.time}</td>
            <td>${lesson.subject}</td>
            <td>${lesson.classroom}</td>
        `;
        elements.scheduleTable.appendChild(row);
    });
}

// 更新倒计时
function updateCountdown() {
    const now = new Date();
    const target = new Date();
    
    // 设置目标时间为今天的 17:00
    target.setHours(17, 0, 0, 0);
    
    // 如果现在已过 17:00，则设置为明天的 17:00
    if (now > target) {
        target.setDate(target.getDate() + 1);
    }
    
    const diffMs = target - now;
    const diffSec = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    
    elements.countdownHours.textContent = String(hours).padStart(2, '0');
    elements.countdownMinutes.textContent = String(minutes).padStart(2, '0');
    elements.countdownSeconds.textContent = String(seconds).padStart(2, '0');
    
    // 更新下一事件信息
    elements.nextEvent.textContent = '下一节课：数学';
    elements.eventTime.textContent = `开始时间：14:00`;
}

// 更新当前活动
function updateCurrentActivity() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 模拟当前活动
    let activityName = '无课程';
    let activityTime = '';
    let progress = 0;
    
    if (currentHour >= 8 && currentHour < 12) {
        activityName = '上午课程';
        activityTime = '08:00 - 12:00';
        const totalMinutes = 4 * 60;
        const passedMinutes = (currentHour - 8) * 60 + currentMinute;
        progress = Math.min(100, Math.floor((passedMinutes / totalMinutes) * 100));
    } else if (currentHour >= 14 && currentHour < 18) {
        activityName = '下午课程';
        activityTime = '14:00 - 18:00';
        const totalMinutes = 4 * 60;
        const passedMinutes = (currentHour - 14) * 60 + currentMinute;
        progress = Math.min(100, Math.floor((passedMinutes / totalMinutes) * 100));
    } else {
        activityName = '休息时间';
        activityTime = '--:-- - --:--';
        progress = 0;
    }
    
    elements.currentActivityName.textContent = activityName;
    elements.currentActivityTime.textContent = activityTime;
    elements.activityProgressFill.style.width = `${progress}%`;
    elements.activityProgressText.textContent = `已过 ${progress}%`;
}

// 添加通知
function addNotification(title, message, timestamp) {
    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item';
    
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;
    
    notificationItem.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 5px;">${title}</div>
        <div>${message}</div>
        <div class="notification-time">${timeStr}</div>
    `;
    
    elements.notificationList.prepend(notificationItem);
    
    // 限制通知数量
    const notifications = elements.notificationList.querySelectorAll('.notification-item');
    if (notifications.length > 10) {
        notifications[notifications.length - 1].remove();
    }
    
    // 发送系统通知
    if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
    }
}

// 清空通知
function clearNotifications() {
    elements.notificationList.innerHTML = '';
}

// 显示临时通知
function showNotification(message) {
    const tempNotification = document.createElement('div');
    tempNotification.className = 'notification-item';
    tempNotification.style.animation = 'fadeInOut 3s forwards';
    
    const timeStr = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
    
    tempNotification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 5px;">提示</div>
        <div>${message}</div>
        <div class="notification-time">${timeStr}</div>
    `;
    
    elements.notificationList.prepend(tempNotification);
    
    setTimeout(() => {
        if (tempNotification.parentNode) {
            tempNotification.remove();
        }
    }, 3000);
}

// 请求通知权限
if (Notification.permission !== 'granted') {
    Notification.requestPermission();
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        10% { opacity: 1; transform: translateY(0); }
        90% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);

// 导出函数供测试
window.app = {
    updateWeather,
    updateSchedule,
    updateCountdown,
    addNotification,
    clearNotifications
};