// api/tour/nearby.js
// TourAPI 위치기반 검색 — 좌표 그리드로 캐싱 (500m 단위)

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('../_lib/cache');
const { TOUR_KEY } = require('../_lib/keys');

const BASE = 'https://apis.data.go.kr/B551011';
const LANG_SERVICE = { ko: 'KorService1', en: 'EngService1', ja: 'JpnService1', zh: 'ChsService1', default: 'EngService1' };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, radius, contentTypeId, lang, numOfRows } = req.query;
  if (!lat || !lng) return errorResponse(res, 400, 'lat, lng are required');
  if (!TOUR_KEY) return errorResponse(res, 500, 'TOUR_API_KEY not configured');

  const l = lang || 'ko';
  const svc = LANG_SERVICE[l] || LANG_SERVICE.default;
  const r = radius || '3000';
  const n = numOfRows || '20';

  // 좌표를 소수점 3자리로 그리드화 (~111m 단위) → 캐시 적중률 극대화
  const glat = parseFloat(lat).toFixed(3);
  const glng = parseFloat(lng).toFixed(3);

  const cacheKey = getCacheKey('tour-near', { lat: glat, lng: glng, r, ct: contentTypeId || '', l, n });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);
  }

  try {
    let url = `${BASE}/${svc}/locationBasedList1?serviceKey=${TOUR_KEY}&MobileOS=AND&MobileApp=KoreaMate&_type=json&mapX=${lng}&mapY=${lat}&radius=${r}&numOfRows=${n}&arrange=E`;
    if (contentTypeId) url += `&contentTypeId=${contentTypeId}`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data?.response?.body?.items?.item || [];
    const result = { items, totalCount: data?.response?.body?.totalCount || 0 };

    setToMemory(cacheKey, result);

    const headers = cacheHeaders(3600, 300);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(result);
  } catch (err) {
    return errorResponse(res, 502, 'TourAPI call failed: ' + err.message);
  }
};
