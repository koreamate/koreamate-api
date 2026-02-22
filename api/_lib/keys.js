// api/_lib/keys.js
// 환경 변수에서 API 키 로드 (Vercel Dashboard > Settings > Environment Variables)

module.exports = {
  ODSAY_KEY: process.env.ODSAY_API_KEY || '',
  TOUR_KEY: process.env.TOUR_API_KEY || '',
  OWM_KEY: process.env.OWM_API_KEY || '',
  SEOUL_KEY: process.env.SEOUL_API_KEY || '',
  GOOGLE_PLACES_KEY: process.env.GOOGLE_PLACES_KEY || '',
};
