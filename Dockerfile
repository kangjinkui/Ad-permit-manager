FROM node:20-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN corepack enable

CMD ["bash", "-lc", "cd /app/web && if [ -f package.json ]; then if [ -f pnpm-lock.yaml ]; then pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000; elif [ -f yarn.lock ]; then yarn install && yarn dev -H 0.0.0.0 -p 3000; else npm install && npm run dev -- --hostname 0.0.0.0 --port 3000; fi; else echo 'web/package.json not found. Container is ready for project setup.' && tail -f /dev/null; fi"]
