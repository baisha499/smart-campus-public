const { ipcRenderer } = require('electron');

// DOM 元素
const elements = {
    weatherToggle: document.getElementById('weather-toggle'),
    scheduleToggle: document.getElementById('schedule-toggle'),
    countdownToggle: document.getElementById('countdown-toggle'),
    activityToggle: document.getElementById('activity-toggle'),
    notificationToggle: document.getElementById('notification-toggle'),
    rollCallToggle: document.getElementById('roll-call-toggle'),
    autohideToggle: document.getElementById('autohide-toggle'),
    clickthroughToggle: document.getElementById('clickthrough-toggle'),
    autostartToggle: document.getElementById('autostart-toggle'),
    alwaysontopToggle: document.getElementById('alwaysontop-toggle'),
    importBtn: document.getElementById('import-schedule'),
    scheduleFile: document.getElementById('schedule-file'),
    importStudentsBtn: document.getElementById('import-students'),
    studentsFile: document.getElementById('students-file'),
    closeBtn: document.getElementById('close-settings')
};

// 设置配置
let settingsConfig = {
    weather: true,
    schedule: true,
    countdown: true,
    activity: true,
    notification: true,
    rollCall: true,
    autohide: false,
    clickthrough: false,
    autostart: false,
    alwaysontop: true
};

// 初始化
function init() {
    // 加载保存的设置
    loadSettings();
    
    // 同步组件状态到主进程
    syncComponentsToMain();
    
    // 绑定事件
    elements.weatherToggle.addEventListener('change', (e) => {
        settingsConfig.weather = e.target.checked;
        saveSettings();
        toggleComponent('weather', e.target.checked);
    });
    
    elements.scheduleToggle.addEventListener('change', (e) => {
        settingsConfig.schedule = e.target.checked;
        saveSettings();
        toggleComponent('schedule', e.target.checked);
    });
    
    elements.countdownToggle.addEventListener('change', (e) => {
        settingsConfig.countdown = e.target.checked;
        saveSettings();
        toggleComponent('countdown', e.target.checked);
    });
    
    elements.activityToggle.addEventListener('change', (e) => {
        settingsConfig.activity = e.target.checked;
        saveSettings();
        toggleComponent('activity', e.target.checked);
    });
    
    elements.notificationToggle.addEventListener('change', (e) => {
        settingsConfig.notification = e.target.checked;
        saveSettings();
        toggleComponent('notification', e.target.checked);
    });
    
    elements.rollCallToggle.addEventListener('change', (e) => {
        settingsConfig.rollCall = e.target.checked;
        saveSettings();
        toggleComponent('roll-call', e.target.checked);
    });
    
    elements.autohideToggle.addEventListener('change', (e) => {
        settingsConfig.autohide = e.target.checked;
        saveSettings();
        toggleAutohide(e.target.checked);
    });
    
    elements.clickthroughToggle.addEventListener('change', (e) => {
        settingsConfig.clickthrough = e.target.checked;
        saveSettings();
        toggleClickthrough(e.target.checked);
    });
    
    elements.autostartToggle.addEventListener('change', (e) => {
        settingsConfig.autostart = e.target.checked;
        saveSettings();
        toggleAutostart(e.target.checked);
    });
    
    elements.alwaysontopToggle.addEventListener('change', (e) => {
        settingsConfig.alwaysontop = e.target.checked;
        saveSettings();
        ipcRenderer.send('set-always-on-top', e.target.checked);
    });
    
    elements.closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-settings');
    });
    
    elements.importBtn.addEventListener('click', () => {
        elements.scheduleFile.click();
    });
    
    elements.scheduleFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importScheduleFile(file);
        }
    });
    
    elements.importStudentsBtn.addEventListener('click', () => {
        elements.studentsFile.click();
    });
    
    elements.studentsFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importStudentsFile(file);
        }
    });
}

// 加载设置
function loadSettings() {
    const saved = localStorage.getItem('widgetSettings');
    if (saved) {
        settingsConfig = { ...settingsConfig, ...JSON.parse(saved) };
    }
    
    // 更新UI状态
    elements.weatherToggle.checked = settingsConfig.weather;
    elements.scheduleToggle.checked = settingsConfig.schedule;
    elements.countdownToggle.checked = settingsConfig.countdown;
    elements.activityToggle.checked = settingsConfig.activity;
    elements.notificationToggle.checked = settingsConfig.notification;
    elements.rollCallToggle.checked = settingsConfig.rollCall;
    elements.autohideToggle.checked = settingsConfig.autohide;
    elements.clickthroughToggle.checked = settingsConfig.clickthrough;
    elements.autostartToggle.checked = settingsConfig.autostart;
    elements.alwaysontopToggle.checked = settingsConfig.alwaysontop;
}

// 保存设置
function saveSettings() {
    localStorage.setItem('widgetSettings', JSON.stringify(settingsConfig));
    // 同时保存到文件，让主进程能够读取
    ipcRenderer.send('save-settings-to-file', settingsConfig);
}

// 同步组件状态到主进程
function syncComponentsToMain() {
    // 只同步状态，不触发窗口创建
    ipcRenderer.send('sync-component-states', settingsConfig);
}

// 切换组件显示/隐藏
function toggleComponent(componentName, show) {
    ipcRenderer.send('toggle-component', componentName, show);
}

// 切换开机自启
function toggleAutostart(enable) {
    ipcRenderer.send('toggle-autostart', enable);
}

// 切换上课自动隐藏
function toggleAutohide(enable) {
    ipcRenderer.send('toggle-autohide', enable);
}

// 切换鼠标穿透
function toggleClickthrough(enable) {
    ipcRenderer.send('toggle-clickthrough', enable);
}

// 导入课程表文件
function importScheduleFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let scheduleData;
            
            if (file.name.endsWith('.json')) {
                scheduleData = JSON.parse(e.target.result);
            } else if (file.name.endsWith('.csv')) {
                // 简单的CSV解析
                const lines = e.target.result.split('\n');
                scheduleData = {};
                
                lines.forEach((line, index) => {
                    if (index === 0 || !line.trim()) return; // 跳过标题行和空行
                    const [weekday, time, subject, classroom] = line.split(',').map(item => item.trim());
                    if (weekday && subject && classroom) {
                        if (!scheduleData[weekday]) scheduleData[weekday] = [];
                        scheduleData[weekday].push({ time, subject, classroom });
                    }
                });
            } else if (file.name.endsWith('.txt')) {
                // TXT文件解析
                const lines = e.target.result.split('\n');
                scheduleData = {};
                
                lines.forEach((line, index) => {
                    if (!line.trim()) return; // 跳过空行
                    
                    // 支持多种格式：
                    // 1. 星期一,08:00-08:45,语文,301
                    // 2. 星期一 08:00-08:45 语文 301
                    // 3. 星期一|08:00-08:45|语文|301
                    
                    let parts;
                    if (line.includes(',')) {
                        parts = line.split(',').map(item => item.trim());
                    } else if (line.includes('|')) {
                        parts = line.split('|').map(item => item.trim());
                    } else {
                        // 默认按空格分割
                        parts = line.split(/\s+/).filter(item => item.trim());
                    }
                    
                    if (parts.length >= 4) {
                        const [weekday, time, subject, classroom] = parts;
                        if (weekday && time && subject && classroom) {
                            if (!scheduleData[weekday]) scheduleData[weekday] = [];
                            scheduleData[weekday].push({ time, subject, classroom });
                        }
                    }
                });
            }
            
            if (scheduleData) {
                // 发送数据到主进程保存
                ipcRenderer.send('import-schedule', scheduleData);
                alert('课程表导入成功！');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('课程表导入失败，请检查文件格式！');
        }
    };
    
    reader.readAsText(file);
}

// 导入学生名单文件
function importStudentsFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let students = [];
            
            if (file.name.endsWith('.txt')) {
                // 处理TXT文件，一行一个名字
                const lines = e.target.result.split('\n');
                students = lines
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
            } else if (file.name.endsWith('.docx')) {
                // 对于DOCX文件，简单提示用户转换为TXT
                alert('请先将DOCX文件转换为TXT格式，一行一个学生名字');
                return;
            } else {
                alert('不支持的文件格式，请使用TXT或DOCX格式');
                return;
            }
            
            if (students.length > 0) {
                // 发送学生名单到主进程保存
                ipcRenderer.send('import-students', students);
                alert(`成功导入 ${students.length} 名学生！`);
            } else {
                alert('文件中没有找到有效的学生名字');
            }
        } catch (error) {
            console.error('导入失败:', error);
            alert('学生名单导入失败，请检查文件格式！');
        }
    };
    
    reader.readAsText(file);
}

// 导出函数供外部调用
window.settings = {
    loadSettings,
    saveSettings,
    toggleComponent,
    toggleAutostart,
    toggleAutohide,
    toggleClickthrough,
    importScheduleFile,
    importStudentsFile
};

// 初始化
document.addEventListener('DOMContentLoaded', init);