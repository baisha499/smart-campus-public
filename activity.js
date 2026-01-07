// DOM 元素
const elements = {
    currentActivityName: document.getElementById('current-activity-name'),
    currentActivityTime: document.getElementById('current-activity-time'),
    activityProgressFill: document.getElementById('activity-progress-fill'),
    activityProgressText: document.getElementById('activity-progress-text')
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

// 获取星期几
function getWeekday(date) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekdays[date.getDay()];
}

// 初始化
function init() {
    updateCurrentActivity();
    // 每分钟更新一次当前活动
    setInterval(updateCurrentActivity, 60000);
}

// 更新当前活动
function updateCurrentActivity() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // 获取今天的课程表
    const weekday = getWeekday(now);
    const todaySchedule = scheduleData[weekday] || [];
    
    // 查找当前正在进行的课程
    let currentLesson = null;
    for (const lesson of todaySchedule) {
        const [startTime, endTime] = lesson.time.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
            currentLesson = lesson;
            break;
        }
    }
    
    // 更新活动信息
    if (currentLesson) {
        const [startTime, endTime] = currentLesson.time.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const totalMinutes = endMinutes - startMinutes;
        const passedMinutes = currentTime - startMinutes;
        const progress = Math.min(100, Math.floor((passedMinutes / totalMinutes) * 100));
        
        elements.currentActivityName.textContent = currentLesson.subject;
        elements.currentActivityTime.textContent = `${startTime} - ${endTime} (${currentLesson.classroom})`;
        elements.activityProgressFill.style.width = `${progress}%`;
        elements.activityProgressText.textContent = `已过 ${progress}%`;
    } else {
        // 查找最近的课程
        let nearestLesson = null;
        let minDiff = Infinity;
        
        for (const lesson of todaySchedule) {
            const [startTime] = lesson.time.split('-');
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            
            const diff = Math.abs(startMinutes - currentTime);
            if (diff < minDiff) {
                minDiff = diff;
                nearestLesson = lesson;
            }
        }
        
        if (nearestLesson) {
            const [startTime, endTime] = nearestLesson.time.split('-');
            elements.currentActivityName.textContent = `课间休息`;
            elements.currentActivityTime.textContent = `下一节：${nearestLesson.subject} (${startTime})`;
            elements.activityProgressFill.style.width = '0%';
            elements.activityProgressText.textContent = '已过 0%';
        } else {
            elements.currentActivityName.textContent = '无课程';
            elements.currentActivityTime.textContent = '--:-- - --:--';
            elements.activityProgressFill.style.width = '0%';
            elements.activityProgressText.textContent = '已过 0%';
        }
    }
}

// 导出函数供外部调用
window.activity = {
    updateCurrentActivity
};

// 监听课程表更新
const { ipcRenderer } = require('electron');
ipcRenderer.on('schedule-updated', (event, newScheduleData) => {
    scheduleData = newScheduleData;
    updateCurrentActivity();
});

// 初始化
document.addEventListener('DOMContentLoaded', init);