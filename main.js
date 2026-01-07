const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, autoUpdater } = require('electron');
const path = require('path');
const fs = require('fs');

let componentWindows = {};
let settingsWindow;
let rollCallWindow;
let tray;
let autohideEnabled = false;
let clickthroughEnabled = false;
let alwaysOnTopEnabled = true; // 添加全局变量跟踪置顶状态
let checkClassInterval;
let componentStates = {
    weather: true,
    schedule: true,
    countdown: true,
    activity: true,
    notification: true,
    rollCall: false
};
let initializationWindow;

// 从文件加载设置
function loadSettingsFromFile() {
    try {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'widget-settings.json');
        
        if (fs.existsSync(settingsPath)) {
            const settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            // 更新组件状态
            Object.keys(settingsData).forEach(key => {
                if (key in componentStates) {
                    componentStates[key] = settingsData[key];
                }
            });
            
            // 处理命名不匹配的情况
            if ('rollCall' in settingsData) {
                componentStates.rollCall = settingsData.rollCall;
            }
            // 兼容旧的或其它版本使用的连字符命名
            if ('roll-call' in settingsData) {
                componentStates.rollCall = settingsData['roll-call'];
            }
            
            // 更新其他设置
            if (settingsData.clickthrough !== undefined) {
                clickthroughEnabled = settingsData.clickthrough;
            }
            if (settingsData.alwaysontop !== undefined) {
                alwaysOnTopEnabled = settingsData.alwaysontop;
            }
            if (settingsData.autohide !== undefined) {
                autohideEnabled = settingsData.autohide;
            }
            
            console.log('加载的设置:', settingsData);
            console.log('组件状态:', componentStates);
        }
    } catch (err) {
        console.error('加载设置失败:', err);
    }
}

function createInitializationWindow() {
  if (initializationWindow) {
    initializationWindow.focus();
    return;
  }

  initializationWindow = new BrowserWindow({
    width: 400,
    height: 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    }
  });

  initializationWindow.loadFile('initialization.html');
  
  // 将窗口居中显示
  initializationWindow.center();
  
  initializationWindow.on('closed', () => {
    initializationWindow = null;
  });

  return initializationWindow;
}

function checkScheduleDataExists() {
  const dataPath = path.join(__dirname, 'schedule-data.json');
  return fs.existsSync(dataPath);
}

function createDefaultScheduleData() {
  return {
    "星期一": [
      { "time": "08:00-08:45", "subject": "语文", "classroom": "301" },
      { "time": "09:00-09:45", "subject": "数学", "classroom": "302" },
      { "time": "10:10-10:55", "subject": "英语", "classroom": "303" },
      { "time": "11:10-11:55", "subject": "物理", "classroom": "304" },
      { "time": "14:00-14:45", "subject": "化学", "classroom": "305" },
      { "time": "15:00-15:45", "subject": "生物", "classroom": "306" }
    ],
    "星期二": [
      { "time": "08:00-08:45", "subject": "数学", "classroom": "302" },
      { "time": "09:00-09:45", "subject": "物理", "classroom": "304" },
      { "time": "10:10-10:55", "subject": "化学", "classroom": "305" },
      { "time": "11:10-11:55", "subject": "生物", "classroom": "306" },
      { "time": "14:00-14:45", "subject": "语文", "classroom": "301" },
      { "time": "15:00-15:45", "subject": "英语", "classroom": "303" }
    ],
    "星期三": [
      { "time": "08:00-08:45", "subject": "英语", "classroom": "303" },
      { "time": "09:00-09:45", "subject": "生物", "classroom": "306" },
      { "time": "10:10-10:55", "subject": "语文", "classroom": "301" },
      { "time": "11:10-11:55", "subject": "数学", "classroom": "302" },
      { "time": "14:00-14:45", "subject": "物理", "classroom": "304" },
      { "time": "15:00-15:45", "subject": "化学", "classroom": "305" }
    ],
    "星期四": [
      { "time": "08:00-08:45", "subject": "化学", "classroom": "305" },
      { "time": "09:00-09:45", "subject": "语文", "classroom": "301" },
      { "time": "10:10-10:55", "subject": "数学", "classroom": "302" },
      { "time": "11:10-11:55", "subject": "英语", "classroom": "303" },
      { "time": "14:00-14:45", "subject": "生物", "classroom": "306" },
      { "time": "15:00-15:45", "subject": "物理", "classroom": "304" }
    ],
    "星期五": [
      { "time": "08:00-08:45", "subject": "生物", "classroom": "306" },
      { "time": "09:00-09:45", "subject": "英语", "classroom": "303" },
      { "time": "10:10-10:55", "subject": "物理", "classroom": "304" },
      { "time": "11:10-11:55", "subject": "化学", "classroom": "305" },
      { "time": "14:00-14:45", "subject": "数学", "classroom": "302" },
      { "time": "15:00-15:45", "subject": "语文", "classroom": "301" }
    ]
  };
}

function saveClassInfo(className) {
  try {
    // 将班级信息保存到应用程序目录下的 class-info.json 文件
    const classInfoPath = path.join(__dirname, 'class-info.json');
    const classInfo = { className };
    fs.writeFileSync(classInfoPath, JSON.stringify(classInfo, null, 2));
    
    // 创建 schedule-data.json 文件
    const scheduleDataPath = path.join(__dirname, 'schedule-data.json');
    const defaultScheduleData = createDefaultScheduleData();
    fs.writeFileSync(scheduleDataPath, JSON.stringify(defaultScheduleData, null, 2));
    
    return true;
  } catch (err) {
    console.error('保存班级信息失败:', err);
    return false;
  }
}

function createComponentWindow(componentName, title) {
  const window = new BrowserWindow({
    width: 300,
    height: 220,
    frame: false,
    transparent: true,
    alwaysOnTop: alwaysOnTopEnabled, // 使用全局置顶状态
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    }
  });

  // 根据clickthroughEnabled设置鼠标穿透
  window.setIgnoreMouseEvents(clickthroughEnabled);

  window.loadFile(`${componentName}.html`);
  
  window.on('closed', () => {
    delete componentWindows[componentName];
  });

  return window;
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minHeight: 400,
    maxHeight: 800,
    frame: false,
    transparent: true,
    alwaysOnTop: alwaysOnTopEnabled,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    }
  });

  // 设置窗口不支持鼠标穿透
  settingsWindow.loadFile('settings.html');
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let trayIcon = nativeImage.createEmpty();
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (err) {
    console.log('托盘图标加载失败，使用默认图标');
  }
  
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '设置',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip('课程表小工具');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    createSettingsWindow();
  });
}

function createRollCallWindow() {
  if (rollCallWindow) {
    rollCallWindow.focus();
    return;
  }

  rollCallWindow = new BrowserWindow({
    width: 600,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: alwaysOnTopEnabled,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    }
  });

  rollCallWindow.loadFile('roll-call-window.html');
  
  // 将窗口居中显示
  rollCallWindow.center();
  
  rollCallWindow.on('closed', () => {
    rollCallWindow = null;
  });

  return rollCallWindow;
}

function initializeComponents() {
  // 初始化所有组件
  if (componentStates.weather) {
    componentWindows.weather = createComponentWindow('weather', '天气');
  }
  if (componentStates.schedule) {
    componentWindows.schedule = createComponentWindow('schedule', '今日课程');
  }
  if (componentStates.countdown) {
    componentWindows.countdown = createComponentWindow('countdown', '倒计时');
  }
  if (componentStates.activity) {
    componentWindows.activity = createComponentWindow('activity', '当前活动');
  }
  if (componentStates.notification) {
    componentWindows.notification = createComponentWindow('notification', '提醒');
  }
  if (componentStates.rollCall || componentStates['roll-call']) {
    componentWindows['roll-call'] = createComponentWindow('roll-call', '随机点名');
  }
}

function setComponentPositions() {
  // 设置各组件的位置，一行放两个，自动检测屏幕边界
  const screen = require('electron').screen;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  const componentWidth = 300;
  const componentHeight = 220;
  const horizontalGap = 20; // 水平间距
  const verticalGap = 20; // 垂直间距
  const margin = 20; // 距离屏幕边缘的边距
  
  let x = screenWidth - (componentWidth * 2 + horizontalGap + margin);
  let y = margin;
  let componentsInRow = 0;
  const maxComponentsPerRow = 2;
  
  // 获取所有激活的组件
  const activeComponents = Object.entries(componentWindows).filter(([name, window]) => window);
  
  activeComponents.forEach(([componentName, window], index) => {
    // 检查当前位置是否会超出屏幕宽度
    if (componentsInRow >= maxComponentsPerRow) {
      // 换到下一行
      x = screenWidth - (componentWidth * 2 + horizontalGap + margin);
      y += componentHeight + verticalGap;
      componentsInRow = 0;
    }
    
    // 检查是否会超出屏幕高度（考虑任务栏）
    if (y + componentHeight > screenHeight - margin) {
      // 超出屏幕，跳过该组件或放在第二页
      // 这里简化处理，回到顶部开始
      x = screenWidth - (componentWidth * 2 + horizontalGap + margin);
      y = margin;
      componentsInRow = 0;
    }
    
    // 设置组件位置
    window.setPosition(x, y);
    
    // 更新下一个组件的位置
    x += componentWidth + horizontalGap;
    componentsInRow++;
  });
}

function toggleAutoStart(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  });
}

function importScheduleData(scheduleData) {
  // 保存导入的课程表数据
  const dataPath = path.join(__dirname, 'schedule-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(scheduleData, null, 2));
  
  // 通知所有相关组件更新
  if (componentWindows.schedule) {
    componentWindows.schedule.webContents.send('schedule-updated', scheduleData);
  }
  if (componentWindows.countdown) {
    componentWindows.countdown.webContents.send('schedule-updated', scheduleData);
  }
  if (componentWindows.activity) {
    componentWindows.activity.webContents.send('schedule-updated', scheduleData);
  }
}

function importStudentsData(studentsData) {
  // 保存导入的学生名单数据
  const dataPath = path.join(__dirname, 'students-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(studentsData, null, 2));
  
  // 通知随机点名组件更新
  if (componentWindows['roll-call']) {
    componentWindows['roll-call'].webContents.send('students-updated', studentsData);
  }
  if (rollCallWindow) {
    rollCallWindow.webContents.send('students-updated', studentsData);
  }
}

function checkClassTime() {
  if (!autohideEnabled) return;
  
  // 获取当前时间
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // 转换为分钟数，方便比较
  
  // 尝试加载课程表数据
  let scheduleData = {};
  try {
    const dataPath = path.join(__dirname, 'schedule-data.json');
    if (fs.existsSync(dataPath)) {
      scheduleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (err) {
    console.error('加载课程表数据失败:', err);
    return;
  }
  
  // 获取今天的课程表（基于周几）
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[now.getDay()];
  const todaySchedule = scheduleData[weekday] || [];
  
  // 检查当前是否在上课时间
  let isInClass = false;
  
  for (const lesson of todaySchedule) {
    const [startTime, endTime] = lesson.time.split('-');
    if (startTime && endTime) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        isInClass = true;
        break;
      }
    }
  }
  
  // 根据上课状态设置窗口置顶
  const shouldBeOnTop = !isInClass;
  setComponentsOnTop(shouldBeOnTop);
}

function setComponentsOnTop(shouldBeOnTop) {
  Object.values(componentWindows).forEach(window => {
    if (window) {
      window.setAlwaysOnTop(shouldBeOnTop);
      // 如果置顶且鼠标穿透开启，则应用鼠标穿透
      if (shouldBeOnTop && clickthroughEnabled) {
        window.setIgnoreMouseEvents(true);
      } else if (!clickthroughEnabled) {
        window.setIgnoreMouseEvents(false);
      }
    }
  });
  if (rollCallWindow) {
    rollCallWindow.setAlwaysOnTop(shouldBeOnTop);
    // 随机点名大窗口不支持鼠标穿透
  }
  if (settingsWindow) {
    settingsWindow.setAlwaysOnTop(shouldBeOnTop);
    // 设置窗口不支持鼠标穿透
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startClassTimeChecker() {
  // 每分钟检查一次
  checkClassInterval = setInterval(checkClassTime, 60 * 1000);
  // 立即检查一次
  checkClassTime();
}

function stopClassTimeChecker() {
  if (checkClassInterval) {
    clearInterval(checkClassInterval);
    checkClassInterval = null;
  }
  // 恢复所有组件的置顶状态
  setComponentsOnTop(true);
}

app.whenReady().then(() => {
  // 隐藏菜单栏
  Menu.setApplicationMenu(null);
  
  // 检查 schedule-data.json 是否存在
  if (!checkScheduleDataExists()) {
    // 如果不存在，显示初始化窗口
    createInitializationWindow();
  } else {
    // 首先加载设置
    loadSettingsFromFile();
    
    // 初始化组件
    initializeComponents();
    createTray();
    
    // 设置组件位置
    setTimeout(() => {
      setComponentPositions();
    }, 1000);
  }
  
  app.on('activate', () => {
    if (Object.keys(componentWindows).length === 0) {
      // 检查是否已完成初始化
      if (checkScheduleDataExists()) {
        loadSettingsFromFile(); // 重新加载设置
        initializeComponents();
      } else {
        createInitializationWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理来自渲染进程的消息

// 窗口控制消息
ipcMain.on('window-minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.minimize();
});

ipcMain.on('window-toggle-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.close();
});

// 设置相关消息
ipcMain.on('show-notification', (event, title, body) => {
  const { Notification } = require('electron');
  new Notification({ title, body }).show();
});

ipcMain.on('set-always-on-top', (event, flag) => {
  // 更新全局置顶状态
  alwaysOnTopEnabled = flag;
  
  // 将所有组件窗口设置为置顶
  Object.values(componentWindows).forEach(window => {
    if (window) window.setAlwaysOnTop(flag);
  });
  if (settingsWindow) {
    settingsWindow.setAlwaysOnTop(flag);
  }
});

ipcMain.on('sync-component-states', (event, states) => {
  // 只更新组件状态，不创建或关闭窗口
  Object.keys(states).forEach(componentName => {
    if (componentName === 'roll-call') {
      componentStates.rollCall = states[componentName];
    } else if (componentName === 'rollCall') {
      componentStates.rollCall = states[componentName];
    } else {
      componentStates[componentName] = states[componentName];
    }
  });
  // 在保存到文件前标准化键名（将连字符形式映射为驼峰）
  const normalized = { ...states };
  if (normalized['roll-call'] !== undefined) {
    normalized.rollCall = normalized['roll-call'];
    delete normalized['roll-call'];
  }
  saveSettingsToFile(normalized);
});

// 保存设置到文件
function saveSettingsToFile(settings) {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'widget-settings.json');
    
    // 读取现有设置
    let existingSettings = {};
    if (fs.existsSync(settingsPath)) {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    
    // 合并设置
    const mergedSettings = { ...existingSettings, ...settings };
    
    // 规范化键名：将连字符命名（如 'roll-call'）映射到驼峰（'rollCall'）以保持一致
    if (mergedSettings['roll-call'] !== undefined) {
      mergedSettings.rollCall = mergedSettings['roll-call'];
      delete mergedSettings['roll-call'];
    }
    
    // 保存到文件
    fs.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));
    
    console.log('保存设置到文件:', mergedSettings);
  } catch (err) {
    console.error('保存设置失败:', err);
  }
}

// 处理从渲染进程发来的保存设置请求
ipcMain.on('save-settings-to-file', (event, settings) => {
  saveSettingsToFile(settings);
});

ipcMain.on('toggle-component', (event, componentName, show) => {
  if (show) {
    if (!componentWindows[componentName]) {
      componentWindows[componentName] = createComponentWindow(componentName, componentName);
      setComponentPositions();
    }
  } else {
    if (componentWindows[componentName]) {
      componentWindows[componentName].close();
      delete componentWindows[componentName];
      setComponentPositions();
    }
  }
  if (componentName === 'roll-call') {
    componentStates.rollCall = show;
  } else {
    componentStates[componentName] = show;
  }
});

ipcMain.on('toggle-autostart', (event, enable) => {
  toggleAutoStart(enable);
});

ipcMain.on('toggle-autohide', (event, enable) => {
  autohideEnabled = enable;
  if (enable) {
    startClassTimeChecker();
  } else {
    stopClassTimeChecker();
  }
});

ipcMain.on('toggle-clickthrough', (event, enable) => {
  clickthroughEnabled = enable;
  // 更新所有现有窗口的鼠标穿透状态
  Object.values(componentWindows).forEach(window => {
    if (window) {
      window.setIgnoreMouseEvents(enable);
    }
  });
});

ipcMain.on('import-schedule', (event, scheduleData) => {
  importScheduleData(scheduleData);
});

ipcMain.on('import-students', (event, studentsData) => {
  importStudentsData(studentsData);
});

ipcMain.on('open-roll-call-window', () => {
  createRollCallWindow();
});

ipcMain.on('close-roll-call-window', () => {
  if (rollCallWindow) {
    rollCallWindow.close();
    rollCallWindow = null;
  }
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
    settingsWindow = null;
  }
});

// 处理初始化窗口的消息
ipcMain.on('initialize-class', (event, className) => {
  const success = saveClassInfo(className);
  if (success) {
    // 关闭初始化窗口
    if (initializationWindow) {
      initializationWindow.close();
      initializationWindow = null;
    }
    
    // 加载设置
    loadSettingsFromFile();
    
    // 初始化组件
    initializeComponents();
    createTray();
    
    // 设置组件位置
    setTimeout(() => {
      setComponentPositions();
    }, 1000);
  }
});

ipcMain.on('close-initialization', () => {
  // 用户点击取消，退出程序
  app.quit();
});