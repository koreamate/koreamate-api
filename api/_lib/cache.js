// api/_lib/cache.js
// Vercel CDN 캐싱 + 메모리 fallback

// 인-메모리 캐시 (같은 인스턴스 내에서만)
const memCache = new Map();

function getCacheKey(prefix, params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `${prefix}:${sorted}`;
}

function getFromMemory(key, ttlMs) {
  const entry = memCache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}

function setToMemory(key, data) {
  memCache.set(key, { data, ts: Date.now() });
  // 캐시 크기 제한
  if (memCache.size > 500) {
    const oldest = [...memCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    oldest.slice(0, 100).forEach(([k]) => memCache.delete(k));
  }
}

// CDN 캐시 헤더 생성
function cacheHeaders(cdnSeconds = 3600, browserSeconds = 300) {
  return {
    'Cache-Control': `s-maxage=${cdnSeconds}, stale-while-revalidate=${cdnSeconds * 2}, max-age=${browserSeconds}`,
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
}

function errorResponse(res, status, message) {
  return res.status(status).json({ error: true, message });
}

module.exports = { getCacheKey, getFromMemory, setToMemory, cacheHeaders, errorResponse };
