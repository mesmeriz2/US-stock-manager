FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package.json ./
RUN npm install

# 애플리케이션 복사
COPY . .

# 포트 노출
EXPOSE 5173

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5173 || exit 1

# 실행
CMD ["npm", "run", "dev", "--", "--host"]




