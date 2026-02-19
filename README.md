# US Stock Manager

미국 주식 매매/보유 현황을 관리하는 풀스택 애플리케이션입니다.

## 기능

- **계정/포지션 관리**: 여러 계정별 매매 내역, 보유 종목 관리
- **매매 기록**: 매수/매도 거래 기록 및 CSV 가져오기
- **배당 관리**: 배당 내역 및 상세 관리
- **현금 관리**: 계정별 현금 잔액 관리
- **포트폴리오 분석**: 차트 및 분석
- **백업/복원**: 데이터 백업 및 복원
- **Docker 지원**: 백엔드(FastAPI) + 프론트엔드(Vite/React) 컨테이너 실행

## 기술 스택

- **Backend**: FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts
- **데이터**: Finnhub API(주가 등), yfinance

## 사전 요구 사항

- [Docker](https://www.docker.com/) 및 Docker Compose (권장)
- 또는 로컬: Python 3.11+, Node.js 18+

## 빠른 시작 (Docker)

1. 저장소 클론 후 프로젝트 디렉터리로 이동:

```bash
git clone https://github.com/mesmeriz2/US-stock-manger.git
cd US-stock-manger
```

2. 환경 변수 설정:

```bash
# .env.example을 복사하여 .env 생성
cp .env.example .env
# .env에서 FINNHUB_API_KEY 등 필요한 값 설정
```

3. 컨테이너 빌드 및 실행:

```bash
docker compose up -d --build
```

4. 접속:

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 로컬 개발

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
# .env 설정 후
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# 백엔드가 localhost:8000에서 동작할 때
npm run dev
# 또는 로컬 백엔드 지정: npm run dev:local
```

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io/) API 키 (주가 등) | 권장 |
| `CORS_ORIGINS` | 허용 CORS 오리진 (쉼표 구분) | 선택 |
| `DATABASE_URL` | DB URL (기본: SQLite `/data/stock_manager.db`) | 선택 |

## 라이선스

MIT
