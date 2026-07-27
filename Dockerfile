# 落站通 - EHS承包商入场许可证管理平台
# 多阶段构建，最小化镜像体积

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

FROM node:22-alpine
LABEL maintainer="落站通"
LABEL description="EHS承包商入场许可证管理平台 - 多人数据共享版"

WORKDIR /app

# 安全：使用非 root 用户
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

# 复制生产依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY . .

# 创建数据持久化目录
RUN mkdir -p /app/data /app/uploads && chown -R appuser:appgroup /app

USER appuser

# SQLite 数据库存储路径（挂载卷）
ENV DB_PATH=/app/data/data.db
ENV UPLOAD_DIR=/app/uploads
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
