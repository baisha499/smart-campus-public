const { ipcRenderer } = require('electron');

// 尝试加载保存的学生名单
let students = [];
try {
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, 'students-data.json');
    if (fs.existsSync(dataPath)) {
        students = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
} catch (err) {
    console.error('加载学生名单失败:', err);
}

// DOM 元素
const elements = {
    studentName: document.getElementById('student-name'),
    studentCount: document.getElementById('student-count'),
    rollButton: document.getElementById('roll-button'),
    rollStatus: document.getElementById('roll-status'),
    closeBtn: document.getElementById('close-roll-call'),
    rollContent: document.getElementById('roll-content'),
    noStudentsContent: document.getElementById('no-students-content')
};

// 滚动状态
let isRolling = false;
let rollInterval;

// 初始化
function init() {
    updateStudentCount();
    checkDataStatus();
    
    elements.rollButton.addEventListener('click', toggleRoll);
    elements.closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-roll-call-window');
    });
}

// 检查数据状态
function checkDataStatus() {
    if (students.length === 0) {
        elements.rollContent.style.display = 'none';
        elements.noStudentsContent.style.display = 'block';
        elements.studentCount.textContent = '暂无学生数据';
    } else {
        elements.rollContent.style.display = 'block';
        elements.noStudentsContent.style.display = 'none';
        elements.rollButton.disabled = false;
    }
}

// 更新学生数量显示
function updateStudentCount() {
    if (students.length > 0) {
        elements.studentCount.textContent = `共 ${students.length} 名学生`;
    } else {
        elements.studentCount.textContent = '暂无学生数据';
    }
}

// 切换滚动状态
function toggleRoll() {
    if (isRolling) {
        stopRoll();
    } else {
        startRoll();
    }
}

// 开始滚动
function startRoll() {
    if (students.length === 0) {
        return;
    }
    
    isRolling = true;
    elements.rollButton.innerHTML = '<i class="fas fa-hand-paper"></i> 停止点名';
    elements.rollButton.classList.add('stop');
    elements.rollStatus.textContent = '正在随机选择...';
    elements.studentName.classList.add('rolling');
    
    // 设置滚动间隔
    rollInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * students.length);
        elements.studentName.textContent = students[randomIndex];
    }, 100);
    
    // 设置随机停止时间 (2-5秒)
    const stopTime = 2000 + Math.random() * 3000;
    setTimeout(stopRoll, stopTime);
}

// 停止滚动
function stopRoll() {
    if (!isRolling) {
        return;
    }
    
    isRolling = false;
    clearInterval(rollInterval);
    
    elements.rollButton.innerHTML = '<i class="fas fa-random"></i> 开始点名';
    elements.rollButton.classList.remove('stop');
    elements.rollStatus.textContent = '';
    elements.studentName.classList.remove('rolling');
    
    // 确保最终选中一个学生
    if (students.length > 0) {
        const randomIndex = Math.floor(Math.random() * students.length);
        const selectedStudent = students[randomIndex];
        elements.studentName.textContent = selectedStudent;
        
        // 显示选中的学生信息
        setTimeout(() => {
            elements.rollStatus.textContent = `已选择: ${selectedStudent}`;
        }, 300);
    }
}

// 监听学生名单更新
ipcRenderer.on('students-updated', (event, newStudents) => {
    students = newStudents;
    updateStudentCount();
    checkDataStatus();
    
    // 重置当前状态
    if (isRolling) {
        stopRoll();
    }
    elements.studentName.textContent = '?';
});

// 导出函数供外部调用
window.rollCallWindow = {
    startRoll,
    stopRoll,
    getStudents: () => students,
    setStudents: (newStudents) => {
        students = newStudents;
        updateStudentCount();
        checkDataStatus();
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', init);