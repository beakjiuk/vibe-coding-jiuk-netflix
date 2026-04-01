vercel 링크 : https://vibe-coding-jiuk-netflix.vercel.app/
# JIUKFLIX — Now Playing Carousel

TMDB “현재 상영중” 영화를 **포스터 캐러셀(자동 슬라이드/드래그/좌우 토글)**로 보여주고,  
포스터를 클릭하면 **상세 모달(평점/장르/런타임/개봉일 등)**이 뜨는 **미니 극장 웹페이지**입니다.

> Vanilla **HTML/CSS/JavaScript**로만 만들었습니다.

## 미리보기

- **메인 캐러셀**: 화면에 4개(반응형) 카드만 보이는 가로 레일
- **자동 재생**: 5초 간격으로 오른쪽 이동 (사용자 조작 시 잠시 멈춤)
- **드래그 이동**: 마우스로 드래그해서 카드 이동 + 스냅
- **찜 기능**: 카드 우상단 하트 → 하단 **관심 영화** 섹션에 모아보기 (세션 기반)

## 기능

- **Now Playing 목록**: `movie/now_playing` 호출 후 포스터 렌더
- **상세 모달**: 카드 클릭 → `movie/{movie_id}` 호출 후 상세 정보 표시
  - 개봉일, 러닝타임, 평점, 평가수, 인기도, 장르, 줄거리
- **랭킹 오버레이**: 카드 좌하단에 순번 표시
- **관심 영화 섹션**: 찜한 포스터를 하단에 동일 카드 크기로 표시 (클릭 시 동일 모달)

## 실행 방법

그냥 열면 됩니다.

- `index.html`을 더블클릭 → 브라우저에서 실행

## 프로젝트 구조

```
.
├─ index.html      # 레이아웃(캐러셀/모달/관심영화 섹션)
├─ styles.css      # 스타일(라이트 테마 + 애니메이션 배경 + 캐러셀/모달)
├─ app.js          # TMDB 호출 + 캐러셀/드래그/자동재생 + 찜 + 모달
└─ README.md
```

## 사용 API

- **Now Playing**: `https://api.themoviedb.org/3/movie/now_playing`
- **Movie Detail**: `https://api.themoviedb.org/3/movie/{movie_id}`
- **Images**: `https://image.tmdb.org/t/p/w500`, `https://image.tmdb.org/t/p/w1280`

## 주의 (API 키)

API 키는 **GitHub에 올리면 안 됩니다.**  
이 프로젝트는 Vercel 배포에서도 키가 노출되지 않도록, 프론트가 TMDB를 직접 호출하지 않고 **`/api/*` 서버리스 함수가 TMDB를 대신 호출**합니다.

- **Vercel 환경변수**: `TMDB_API_KEY` (Production/Preview/Development에 설정)

### 로컬 실행 (Vercel 환경변수 사용)

1) Vercel CLI 설치 후 로그인
2) 환경변수 내려받기

```bash
vercel login
vercel link
vercel env pull .env.local
```

3) 실행

```bash
vercel dev
```
