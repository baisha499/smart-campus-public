const { ipcRenderer } = require('electron');

// 尝试加载保存的课程表数据
let scheduleData = {};
try {
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, 'schedule-data.json');
    if (fs.existsSync(dataPath)) {
        scheduleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
} catch (err) {
    console.error('加载课程表数据失败:', err);
}

// 如果没有数据，使用默认数据
if (Object.keys(scheduleData).length === 0) {
    scheduleData = {
        '星期一': [
            { time: '08:00-08:45', subject: '语文', classroom: '301' },
            { time: '09:00-09:45', subject: '数学', classroom: '302' },
            { time: '10:10-10:55', subject: '英语', classroom: '303' },
            { time: '11:10-11:55', subject: '物理', classroom: '304' },
            { time: '14:00-14:45', subject: '化学', classroom: '305' },
            { time: '15:00-15:45', subject: '生物', classroom: '306' }
        ],
        '星期二': [
            { time: '08:00-08:45', subject: '历史', classroom: '301' },
            { time: '09:00-09:45', subject: '地理', classroom: '302' },
            { time: '10:10-10:55', subject: '政治', classroom: '303' }
        ]
    };
}

// DOM 元素
const elements = {
    scheduleDate: document.getElementById('schedule-date'),
    scheduleTable: document.getElementById('schedule-table').querySelector('tbody'),
    prevDayBtn: document.getElementById('prev-day'),
    nextDayBtn: document.getElementById('next-day')
};

// 当前日期
let currentDate = new Date();
let currentDateStr = formatDate(currentDate);

// 初始化
function init() {
    elements.prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateSchedule();
    });
    
    elements.nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateSchedule();
    });
    
    updateSchedule();
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

// 更新课程表
function updateSchedule() {
    const weekday = getWeekday(currentDate);
    const dateDisplay = `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月${currentDate.getDate()}日 ${weekday}`;
    elements.scheduleDate.textContent = dateDisplay;
    
    const schedule = scheduleData[weekday] || [];
    elements.scheduleTable.innerHTML = '';
    
    if (schedule.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center; color: #aaa;">今日无课程</td>`;
        elements.scheduleTable.appendChild(row);
        return;
    }
    
    // 判断是否是今天，只有今天才进行时间判断
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    let currentTimeInMinutes = 0;
    let isCurrentLesson = false;
    let isPastLesson = false;
    
    if (isToday) {
        // 如果是今天，获取当前时间
        currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();
    }
    
    schedule.forEach((lesson, index) => {
        const [startTime, endTime] = lesson.time.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;
        
        if (isToday) {
            // 只有今天才判断课程状态
            isCurrentLesson = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
            isPastLesson = currentTimeInMinutes > endTimeInMinutes;
        } else {
            // 不是今天的课程，不进行时间判断
            isCurrentLesson = false;
            isPastLesson = false;
        }
        
        const row = document.createElement('tr');
        if (isCurrentLesson) {
            row.className = 'current-lesson';
        }
        
        let timeDisplay = lesson.time;
        if (isPastLesson) {
            timeDisplay = `${lesson.time}（已上完）`;
        } else if (isCurrentLesson) {
            timeDisplay = `${lesson.time}（正在进行）`;
        } else {
            timeDisplay = `${lesson.time}（未开始）`;
        }
        
        row.innerHTML = `
            <td>${timeDisplay}</td>
            <td>${lesson.subject}</td>
            <td>${lesson.classroom}</td>
        `;
        elements.scheduleTable.appendChild(row);
        
        // 如果是当前课程，滚动到该课程
        if (isCurrentLesson) {
            setTimeout(() => {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    });
}

// 监听课程表更新
ipcRenderer.on('schedule-updated', (event, newScheduleData) => {
    scheduleData = newScheduleData;
    updateSchedule();
});

// 导出函数供外部调用
window.schedule = {
    updateSchedule,
    formatDate,
    getWeekday
};

// 初始化
document.addEventListener('DOMContentLoaded', init);