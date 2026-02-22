# KoreaMate API Server

KoreaMate 앱 전용 API 프록시 서버 (Vercel Serverless)

## 🎯 왜 필요한가?

| 문제 | 해결 |
|------|------|
| ODsay API 80% 소진 | CDN 캐싱으로 **70~80% 호출 절감** |
| API 키 앱에 노출 | 서버에서 관리, 앱에는 키 없음 |
| Cafe24 속도 한계 | Vercel Edge Network (전세계 CDN) |
| 무료 | Vercel Hobby 플랜 **₩0** |

## 📊 캐싱 전략

| API | CDN 캐시 | 효과 |
|-----|---------|------|
| ODsay 경로검색 | **1시간** | 서울역→강남 100명 검색 → ODsay 1번만 호출 |
| ODsay 주변역 | 2시간 | 같은 위치 반복 검색 최소화 |
| TourAPI 검색 | 30분 | 관광지/맛집 목록 캐싱 |
| TourAPI 상세 | 2시간 | 상세 페이지 캐싱 |
| 날씨 | 30분 | 도시별 날씨 캐싱 |
| 혼잡도 | 10분 | 실시간이지만 10분 단위 |

## 🚀 배포 방법 (5분)

### 1. Vercel 가입 & CLI 설치

```bash
npm i -g vercel
vercel login    # GitHub 계정으로 로그인
```

### 2. 배포

```bash
cd koreamate-api
vercel          # 첫 배포 (프로젝트 설정)
```

질문에 답변:
- Set up and deploy? → **Y**
- Which scope? → 본인 계정 선택
- Link to existing project? → **N**
- Project name? → **koreamate-api**
- Directory? → **./
- Override settings? → **N**

### 3. 환경변수 등록

```bash
# 하나씩 등록 (CLI)
vercel env add ODSAY_API_KEY        # 값 입력
vercel env add TOUR_API_KEY         # 값 입력
vercel env add OWM_API_KEY          # 값 입력 (선택)
vercel env add SEOUL_API_KEY        # 값 입력 (선택)
```

또는 **Vercel Dashboard** → Settings → Environment Variables 에서 등록

### 4. 프로덕션 배포

```bash
vercel --prod
```

배포 완료되면 URL 받음: `https://koreamate-api.vercel.app`

### 5. 테스트

```bash
# 헬스체크
curl https://koreamate-api.vercel.app/api/health

# ODsay 경로 검색 테스트 (서울역→강남역)
curl "https://koreamate-api.vercel.app/api/odsay/route?sx=126.9727&sy=37.5547&ex=127.0276&ey=37.4979"

# TourAPI 검색
curl "https://koreamate-api.vercel.app/api/tour/search?keyword=경복궁&lang=ko"
```

## 📁 구조

```
koreamate-api/
├── vercel.json          # Vercel 설정
├── package.json
├── .env.example         # 환경변수 예시
├── api/
│   ├── _lib/
│   │   ├── cache.js     # 캐싱 유틸
│   │   └── keys.js      # API 키 관리
│   ├── health.js        # 헬스체크
│   ├── weather.js       # 날씨 프록시
│   ├── crowd.js         # 혼잡도 프록시
│   ├── odsay/
│   │   ├── route.js     # 경로 검색
│   │   └── stations.js  # 주변 역/정류장
│   └── tour/
│       ├── search.js    # 관광지 검색
│       ├── nearby.js    # 위치기반 검색
│       └── detail.js    # 상세정보
```

## 💰 비용

| 항목 | Vercel Hobby (무료) | 한도 |
|------|---------------------|------|
| Serverless 실행 | ✅ | 월 100시간 |
| 대역폭 | ✅ | 월 100GB |
| CDN 캐시 | ✅ | 무제한 |
| 도메인 | ✅ | *.vercel.app 무료 |

앱 사용자 수만 명까지 무료로 충분합니다.
