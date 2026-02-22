// api/tour/search.js
// 한국관광공사 TourAPI 검색 프록시 — CDN 30분 캐싱

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('../_lib/cache');
const { TOUR_KEY } = require('../_lib/keys');

const BASE = 'https://apis.data.go.kr/B551011';
const LANG_SERVICE = {
  ko: 'KorService1', en: 'EngService1', ja: 'JpnService1',
  zh: 'ChsService1', default: 'EngService1',
};
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, contentTypeId, areaCode, lang, page, numOfRows, arrange } = req.query;
  if (!TOUR_KEY) return errorResponse(res, 500, 'TOUR_API_KEY not configured');

  const l = lang || 'ko';
  const svc = LANG_SERVICE[l] || LANG_SERVICE.default;
  const p = page || '1';
  const n = numOfRows || '30';
  const a = arrange || 'P'; // 인기순

  const cacheKey = getCacheKey('tour-search', { keyword: keyword || '', ct: contentTypeId || '', ac: areaCode || '', l, p, n, a });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);
  }

  try {
    let url;
    if (keyword) {
      url = `${BASE}/${svc}/searchKeyword1?serviceKey=${TOUR_KEY}&MobileOS=AND&MobileApp=KoreaMate&_type=json&keyword=${encodeURIComponent(keyword)}&pageNo=${p}&numOfRows=${n}&arrange=${a}`;
    } else {
      url = `${BASE}/${svc}/areaBasedList1?serviceKey=${TOUR_KEY}&MobileOS=AND&MobileApp=KoreaMate&_type=json&pageNo=${p}&numOfRows=${n}&arrange=${a}`;
    }
    if (contentTypeId) url += `&contentTypeId=${contentTypeId}`;
    if (areaCode) url += `&areaCode=${areaCode}`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data?.response?.body?.items?.item || [];
    const totalCount = data?.response?.body?.totalCount || 0;
    const result = { items, totalCount, page: parseInt(p), numOfRows: parseInt(n) };

    setToMemory(cacheKey, result);

    const headers = cacheHeaders(1800, 300); // 30분 CDN
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(result);
  } catch (err) {
    return errorResponse(res, 502, 'TourAPI call failed: ' + err.message);
  }
};
