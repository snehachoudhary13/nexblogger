FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY backend/. ./
COPY frontend/. ./public/
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app && \
    mkdir -p /app/data /app/uploads && chown -R app:app /app
VOLUME ["/app/data"]
VOLUME ["/app/uploads"]
USER app
CMD ["node", "server.js"]
