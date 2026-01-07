// DOM 元素
const elements = {
    notificationList: document.getElementById('notification-list'),
    clearNotificationsBtn: document.getElementById('clear-notifications')
};

// 初始化
function init() {
    elements.clearNotificationsBtn.addEventListener('click', clearNotifications);
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

// 导出函数供外部调用
window.notification = {
    addNotification,
    clearNotifications,
    showNotification
};

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

// 初始化
document.addEventListener('DOMContentLoaded', init);