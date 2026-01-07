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
    temperature: document.getElementById('temperature'),
    weatherDesc: document.getElementById('weather-desc'),
    city: document.getElementById('city'),
    wind: document.getElementById('wind'),
    humidity: document.getElementById('humidity'),
    weatherIcon: document.getElementById('weather-icon')
};

// 初始化
function init() {
    updateWeather();
    // 每30分钟更新一次天气
    setInterval(updateWeather, 30 * 60 * 1000);
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

// 初始化
document.addEventListener('DOMContentLoaded', init);