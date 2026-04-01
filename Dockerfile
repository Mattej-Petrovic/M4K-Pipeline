FROM node:22-alpine AS builder

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node index.js ./

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS production

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=builder --chown=65532:65532 /app/index.js ./index.js
COPY --from=builder --chown=65532:65532 /app/package*.json ./

USER 65532:65532

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "const http=require('http');const req=http.get('http://127.0.0.1:3000/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"]

CMD ["index.js"]
