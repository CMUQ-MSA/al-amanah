# Build stage
FROM node:20-alpine AS build

WORKDIR /app/frontend

# Copy deps first for better layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source (tests excluded via .dockerignore to keep image lean)
COPY frontend/ ./

# Build the app
RUN npm run build

# Production stage
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/frontend/dist/ /usr/share/nginx/html/
RUN printf 'ok\n' > /usr/share/nginx/html/healthz \
    && chown -R nginx:nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
