// services/weatherService.js
import * as Location from 'expo-location';

// ！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！
// ！！！ 重要：请务必将下面的 'YOUR...' 替换成您自己的API Key ！！！
// ！！！ 您可以去 https://openweathermap.org/appid 免费注册一个。 ！！！
// ！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！
const API_KEY = '4c36e9a23d2e41a94ec9f5cd37d3ad3b'; 

const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

export const getCurrentWeather = async () => {
  try {
    // 1. 请求用户授权
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied. You can add weather manually.');
      return null;
    }

    // 2. 获取当前位置坐标
    console.log('Getting location...');
    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    console.log(`Location found: ${latitude}, ${longitude}`);

    // 3. 使用坐标请求天气数据
    const response = await fetch(
      `${API_URL}?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) {
        // 如果服务器回复不成功（比如API Key错误），就抛出这个错误
        throw new Error('Weather data not found');
    }

    const data = await response.json();
    console.log('Weather data received:', data);

    // 4. 从返回的复杂数据中，只提取我们需要的部分
    const weatherInfo = {
      city: data.name,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].main,
      icon: data.weather[0].icon,
    };

    return weatherInfo;

  } catch (error) {
    console.error('Error getting current weather:', error);
    alert('Could not fetch weather. Please try again later.');
    return null;
  }
};