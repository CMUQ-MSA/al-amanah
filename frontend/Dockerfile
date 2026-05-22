# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (tests excluded via .dockerignore to keep image lean)
COPY . .

# Build the app
RUN npm run build

# Production stage - copy built files to a volume
FROM alpine:latest
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "find /output -mindepth 1 -maxdepth 1 -exec rm -rf {} + && cp -r /dist/. /output/"]
