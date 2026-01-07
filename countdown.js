// DOM 元素
const elements = {
    countdownHours: document.getElementById('countdown-hours'),
    countdownMinutes: document.getElementById('countdown-minutes'),
    countdownSeconds: document.getElementById('countdown-seconds'),
    nextEvent: document.getElementById('next-event'),
    eventTime: document.getElementById('event-time')
};

// 课程表数据
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

// 记录已提醒的课程，避免重复提醒
const notifiedLessons = new Set();

// 检查并发送提醒
function checkAndNotify(lesson, minDiff) {
    const lessonKey = `${lesson.subject}-${lesson.time.split('-')[0]}`;
    const startTimeKey = `start-${lessonKey}`;
    const currentTime = new Date();
    const seconds = currentTime.getSeconds();
    
    // 如果距离上课还有5分钟且未提醒过，则发送提醒
    if (minDiff === 5 && !notifiedLessons.has(lessonKey)) {
        const message = `下一节课${lesson.subject}，${lesson.time.split('-')[0]}开始`;
        sendNotification(message);
        notifiedLessons.add(lessonKey);
    }
    
    // 如果课程刚开始（0分钟0秒）且未发送过开始通知，则发送开始通知
    if (minDiff === 0 && seconds === 0 && !notifiedLessons.has(startTimeKey)) {
        const message = `${lesson.subject}课现在开始！`;
        sendNotification(message);
        notifiedLessons.add(startTimeKey);
    }
    
    // 如果课程已经开始超过1分钟，清除提醒记录（为下一次课程准备）
    if (minDiff < -1) {
        notifiedLessons.clear();
    }
}

// 发送系统通知和临时通知
function sendNotification(message) {
    // 发送系统通知
    if (Notification.permission === 'granted') {
        new Notification('上课提醒', { body: message });
    }
    
    // 如果有通知组件，也发送临时通知
    if (window.notification && window.notification.showNotification) {
        window.notification.showNotification(message);
    }
}

// 获取星期几
function getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekdays[date.getDay()];
}

// 初始化
function init() {
    updateCountdown();
    // 每秒更新倒计时
    setInterval(updateCountdown, 1000);
}

// 更新倒计时
function updateCountdown() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // 获取今天的课程表
    const weekday = getWeekday(now);
    const todaySchedule = scheduleData[weekday] || [];
    
    // 查找下一节课
    let nextLesson = null;
    let minDiff = Infinity;
    let hasCurrentLesson = false;
    
    for (const lesson of todaySchedule) {
        const [startTime, endTime] = lesson.time.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        // 检查是否是当前正在进行的课程
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
            hasCurrentLesson = true;
            // 当前课程结束后，查找下一节课
            const remainingTime = endMinutes - currentTime;
            if (remainingTime < minDiff) {
                minDiff = remainingTime;
                nextLesson = lesson;
            }
        }
        // 如果不是当前课程，查找未来的课程
        else if (startMinutes > currentTime) {
            const diff = startMinutes - currentTime;
            if (diff < minDiff) {
                minDiff = diff;
                nextLesson = lesson;
            }
        }
    }
    
    // 如果今天没有下一节课，查找明天的第一节课
    if (!nextLesson) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowWeekday = getWeekday(tomorrow);
        const tomorrowSchedule = scheduleData[tomorrowWeekday] || [];
        
        if (tomorrowSchedule.length > 0) {
            nextLesson = tomorrowSchedule[0];
            // 计算到明天第一节课的时间差
            const [startTime] = nextLesson.time.split('-');
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const tomorrowStartMinutes = startHour * 60 + startMinute;
            const todayEndMinutes = 24 * 60;
            minDiff = todayEndMinutes - currentTime + tomorrowStartMinutes;
        }
    }
    
    // 更新倒计时显示
    const hours = Math.floor(minDiff / 60);
    const minutes = minDiff % 60;
    const seconds = 59 - now.getSeconds(); // 改为倒数
    
    elements.countdownHours.textContent = String(hours).padStart(2, '0');
    elements.countdownMinutes.textContent = String(minutes).padStart(2, '0');
    elements.countdownSeconds.textContent = String(seconds).padStart(2, '0');
    
    // 更新下一事件信息
    if (nextLesson) {
        // 检查是否是当前正在进行的课程
        const [startTime, endTime] = nextLesson.time.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
            // 当前正在进行的课程
            elements.nextEvent.textContent = `当前课程：${nextLesson.subject}`;
            elements.eventTime.textContent = `结束时间：${endTime}`;
        } else {
            // 下一节课
            elements.nextEvent.textContent = `下一节课：${nextLesson.subject}`;
            elements.eventTime.textContent = `开始时间：${startTime}`;
        }
        
        // 上课前5分钟提醒
        checkAndNotify(nextLesson, minDiff);
    } else {
        elements.nextEvent.textContent = '暂无课程';
        elements.eventTime.textContent = '开始时间：--:--';
    }
}

// 导出函数供外部调用
window.countdown = {
    updateCountdown
};

// 监听课程表更新
const { ipcRenderer } = require('electron');
ipcRenderer.on('schedule-updated', (event, newScheduleData) => {
    scheduleData = newScheduleData;
    updateCountdown();
});

// 初始化
document.addEventListener('DOMContentLoaded', init);