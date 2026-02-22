// api/tour/detail.js
// TourAPI 상세정보 — CDN 2시간 캐싱 (상세 정보는 자주 안 바뀜)

const { cacheHeaders, getCacheKey, getFromMemory, setToMemory, errorResponse } = require('../_lib/cache');
const { TOUR_KEY } = require('../_lib/keys');

const BASE = 'https://apis.data.go.kr/B551011';
const LANG_SERVICE = { ko: 'KorService1', en: 'EngService1', ja: 'JpnService1', zh: 'ChsService1', default: 'EngService1' };
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2시간

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { contentId, contentTypeId, lang } = req.query;
  if (!contentId) return errorResponse(res, 400, 'contentId is required');
  if (!TOUR_KEY) return errorResponse(res, 500, 'TOUR_API_KEY not configured');

  const l = lang || 'ko';
  const svc = LANG_SERVICE[l] || LANG_SERVICE.default;

  const cacheKey = getCacheKey('tour-detail', { id: contentId, ct: contentTypeId || '', l });
  const cached = getFromMemory(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return res.status(200).setHeader('X-Cache', 'MEMORY').json(cached);
  }

  try {
    // 공통정보 + 소개정보 + 이미지 동시 요청
    const base = `${BASE}/${svc}`;
    const common = `serviceKey=${TOUR_KEY}&MobileOS=AND&MobileApp=KoreaMate&_type=json&contentId=${contentId}`;

    const urls = [
      `${base}/detailCommon1?${common}&defaultYN=Y&addrinfoYN=Y&overviewYN=Y&firstImageYN=Y${contentTypeId ? '&contentTypeId=' + contentTypeId : ''}`,
      contentTypeId ? `${base}/detailIntro1?${common}&contentTypeId=${contentTypeId}` : null,
      `${base}/detailImage1?${common}&imageYN=Y&subImageYN=Y`,
    ].filter(Boolean);

    const results = await Promise.all(urls.map(u => fetch(u).then(r => r.json()).catch(() => null)));

    const commonData = results[0]?.response?.body?.items?.item?.[0] || null;
    const introData = contentTypeId ? (results[1]?.response?.body?.items?.item?.[0] || null) : null;
    const images = results[contentTypeId ? 2 : 1]?.response?.body?.items?.item || [];

    const result = { common: commonData, intro: introData, images };

    setToMemory(cacheKey, result);

    const headers = cacheHeaders(7200, 600); // 2시간 CDN
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('X-Cache', 'MISS');

    return res.status(200).json(result);
  } catch (err) {
    return errorResponse(res, 502, 'TourAPI detail failed: ' + err.message);
  }
};
