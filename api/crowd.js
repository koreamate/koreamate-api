// api/crowd.js
// 서울시 실시간 도시데이터 프록시 — CDN 10분 캐싱

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('./_lib/cache');
const { SEOUL_KEY } = require('./_lib/keys');

const CACHE_TTL_MS = 10 * 60 * 1000; // 10분 (실시간 데이터)

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { place } = req.query;
  if (!place) return errorResponse(res, 400, 'place is required');
  if (!SEOUL_KEY) return errorResponse(res, 500, 'SEOUL_API_KEY not configured');

  const cacheKey = getCacheKey('crowd', { place });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);

  try {
    const url = `http://openapi.seoul.go.kr:8088/${SEOUL_KEY}/json/citydata_ppltn/1/5/${encodeURIComponent(place)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();

    const ppltn = data?.['SeoulRtd.citydata_ppltn'];
    if (!ppltn || ppltn.RESULT?.CODE !== 'INFO-000') {
      return errorResponse(res, 502, 'Seoul API error: ' + (ppltn?.RESULT?.MESSAGE || 'Unknown'));
    }

    const row = ppltn.row?.[0];
    const result = {
      areaName: row?.AREA_NM,
      congestion: row?.AREA_CONGEST_LVL,
      congestionMsg: row?.AREA_CONGEST_MSG,
      populationMin: row?.AREA_PPLTN_MIN,
      populationMax: row?.AREA_PPLTN_MAX,
      maleRate: row?.MALE_PPLTN_RATE,
      femaleRate: row?.FEMALE_PPLTN_RATE,
      updatedAt: row?.PPLTN_TIME,
    };

    setToMemory(cacheKey, result);

    const h = cacheHeaders(600, 120); // 10분 CDN
    Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(result);
  } catch (err) {
    return errorResponse(res, 502, 'Seoul API failed: ' + err.message);
  }
};
