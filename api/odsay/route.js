// api/odsay/route.js
// ODsay 경로 검색 프록시 — CDN 1시간 캐싱 (동일 출발/도착 좌표)
// 효과: 같은 경로 검색 시 ODsay 호출 없이 CDN에서 즉시 응답

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('../_lib/cache');
const { ODSAY_KEY } = require('../_lib/keys');

const ODSAY_BASE = 'https://api.odsay.com/v1/api';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간 메모리 캐시

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sx, sy, ex, ey, opt } = req.query;

  if (!sx || !sy || !ex || !ey) {
    return errorResponse(res, 400, 'sx, sy, ex, ey are required');
  }

  if (!ODSAY_KEY) {
    return errorResponse(res, 500, 'ODSAY_API_KEY not configured');
  }

  // 좌표를 소수점 4자리로 라운딩 (약 11m 정밀도) → 캐시 적중률 향상
  const rsx = parseFloat(sx).toFixed(4);
  const rsy = parseFloat(sy).toFixed(4);
  const rex = parseFloat(ex).toFixed(4);
  const rey = parseFloat(ey).toFixed(4);

  // 메모리 캐시 확인
  const cacheKey = getCacheKey('odsay-route', { sx: rsx, sy: rsy, ex: rex, ey: rey, opt: opt || '0' });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);
  }

  try {
    const url = `${ODSAY_BASE}/searchPubTransPathT?SX=${rsx}&SY=${rsy}&EX=${rex}&EY=${rey}&OPT=${opt || '0'}&apiKey=${encodeURIComponent(ODSAY_KEY)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return errorResponse(res, 502, data.error.msg || 'ODsay error');
    }

    // 메모리에 캐싱
    setToMemory(cacheKey, data);

    // CDN 캐시: 1시간 캐시, 2시간 stale-while-revalidate
    const headers = cacheHeaders(3600, 300);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(data);
  } catch (err) {
    return errorResponse(res, 502, 'ODsay API call failed: ' + err.message);
  }
};
