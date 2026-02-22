// api/weather.js
// OpenWeatherMap 프록시 — CDN 30분 캐싱

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('./_lib/cache');
const { OWM_KEY } = require('./_lib/keys');

const CITIES = [
  { id: 'seoul', lat: 37.5665, lng: 126.978 },
  { id: 'busan', lat: 35.1796, lng: 129.0756 },
  { id: 'jeju', lat: 33.4996, lng: 126.5312 },
  { id: 'incheon', lat: 37.4563, lng: 126.7052 },
  { id: 'gyeongju', lat: 35.8562, lng: 129.2248 },
  { id: 'gangneung', lat: 37.7519, lng: 128.8761 },
  { id: 'jeonju', lat: 35.8242, lng: 127.148 },
  { id: 'daegu', lat: 35.8714, lng: 128.6014 },
];
const CACHE_TTL_MS = 30 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!OWM_KEY) return errorResponse(res, 500, 'OWM_API_KEY not configured');

  const { cities: cityParam, lat, lng } = req.query;

  // 단일 좌표 요청
  if (lat && lng) {
    const glat = parseFloat(lat).toFixed(2);
    const glng = parseFloat(lng).toFixed(2);
    const cacheKey = getCacheKey('weather-loc', { lat: glat, lng: glng });
    const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
    if (cached) return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);

    try {
      const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_KEY}&units=metric`);
      const data = await r.json();
      setToMemory(cacheKey, data);
      const h = cacheHeaders(1800, 300);
      Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(200).json(data);
    } catch (err) {
      return errorResponse(res, 502, 'Weather API failed');
    }
  }

  // 도시 목록 요청
  const requested = cityParam ? cityParam.split(',') : CITIES.map(c => c.id);
  const targets = CITIES.filter(c => requested.includes(c.id));

  const cacheKey = getCacheKey('weather-cities', { c: targets.map(t => t.id).join(',') });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);

  try {
    const results = await Promise.all(
      targets.map(async (city) => {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lng}&appid=${OWM_KEY}&units=metric`);
        const data = await r.json();
        return { ...data, _cityId: city.id };
      })
    );

    setToMemory(cacheKey, results);
    const h = cacheHeaders(1800, 300);
    Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(results);
  } catch (err) {
    return errorResponse(res, 502, 'Weather API failed: ' + err.message);
  }
};
