# Docker Development

This project includes a local development container for the planned Next.js app.

## Start the container

```bash
docker compose up --build
```

The Next.js app lives in `web/`, and the container runs that app automatically.

## Open a shell in the container

```bash
docker exec -it ad-permit-manager-web bash
```

## App location

- source: `web/`
- dev server: `http://localhost:3000`
- production build check:

```bash
docker exec ad-permit-manager-web bash -lc "cd /app/web && NODE_ENV=production npm run build"
```

## Stop the container

```bash
docker compose down
```
