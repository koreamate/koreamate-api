// api/odsay/stations.js
// ODsay 주변 정류장/역 검색 — CDN 2시간 캐싱 (정류장은 자주 안 바뀜)

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('../_lib/cache');
const { ODSAY_KEY } = require('../_lib/keys');

const ODSAY_BASE = 'https://api.odsay.com/v1/api';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2시간

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lng, lat, radius, stationClass } = req.query;

  if (!lng || !lat) return errorResponse(res, 400, 'lng, lat are required');
  if (!ODSAY_KEY) return errorResponse(res, 500, 'ODSAY_API_KEY not configured');

  const rlng = parseFloat(lng).toFixed(4);
  const rlat = parseFloat(lat).toFixed(4);
  const r = radius || '500';
  const sc = stationClass || '';

  const cacheKey = getCacheKey('odsay-stn', { lng: rlng, lat: rlat, r, sc });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);
  }

  try {
    let url = `${ODSAY_BASE}/pointSearch?x=${rlng}&y=${rlat}&radius=${r}&apiKey=${encodeURIComponent(ODSAY_KEY)}`;
    if (sc) url += `&stationClass=${sc}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) return errorResponse(res, 502, data.error.msg || 'ODsay error');

    setToMemory(cacheKey, data);

    const headers = cacheHeaders(7200, 600); // 2시간 CDN
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(data);
  } catch (err) {
    return errorResponse(res, 502, 'ODsay API call failed: ' + err.message);
  }
};
