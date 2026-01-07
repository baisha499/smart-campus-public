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
    studentCount: document.getElementById('student-count'),
    openRollCallBtn: document.getElementById('open-roll-call'),
    importPrompt: document.getElementById('import-prompt')
};

// 初始化
function init() {
    updateStudentCount();
    checkDataStatus();
    
    elements.openRollCallBtn.addEventListener('click', () => {
        ipcRenderer.send('open-roll-call-window');
    });
}

// 检查数据状态
function checkDataStatus() {
    if (students.length === 0) {
        elements.importPrompt.style.display = 'block';
        elements.openRollCallBtn.style.opacity = '0.6';
        elements.openRollCallBtn.disabled = true;
    } else {
        elements.importPrompt.style.display = 'none';
        elements.openRollCallBtn.style.opacity = '1';
        elements.openRollCallBtn.disabled = false;
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

// 监听学生名单更新
ipcRenderer.on('students-updated', (event, newStudents) => {
    students = newStudents;
    updateStudentCount();
    checkDataStatus();
});

// 导出函数供外部调用
window.rollCallWidget = {
    getStudents: () => students,
    setStudents: (newStudents) => {
        students = newStudents;
        updateStudentCount();
        checkDataStatus();
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', init);