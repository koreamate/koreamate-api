// api/health.js
module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'KoreaMate API',
    version: '1.0.0',
    time: new Date().toISOString(),
    endpoints: [
      'GET /api/odsay/route?sx=&sy=&ex=&ey=',
      'GET /api/odsay/stations?lng=&lat=',
      'GET /api/tour/search?keyword=&contentTypeId=&areaCode=&lang=',
      'GET /api/tour/detail?contentId=&contentTypeId=&lang=',
      'GET /api/tour/nearby?lat=&lng=&contentTypeId=&lang=',
      'GET /api/weather?cities=seoul,busan',
      'GET /api/crowd?place=',
    ],
  });
};
