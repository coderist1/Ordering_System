# Frontend (React + Vite)

This app can run locally or be deployed independently (for example to Vercel).

## Required Environment Variable

The frontend uses this variable during local development:

```bash
VITE_API_BASE_URL=/api/v1
```

In production, the app stays same-origin and always uses `/api/v1` through the Vercel rewrite.

## Local Run Commands

```bash
cd frontend
npm install
npm run dev
```

## Production Build Commands

```bash
cd frontend
npm install
npm run build
npm run preview
```

## Deploy to Vercel (CLI)

1. Install CLI:

```bash
npm install -g vercel
```

2. Deploy:

```bash
cd frontend
vercel
```

3. Set production env var in Vercel project settings:

```bash
VITE_API_BASE_URL=/api/v1
```

4. Push production deploy:

```bash
vercel --prod
```

## Deploy to Vercel (Git Integration)

1. Import this repository into Vercel.
2. Set Root Directory to `frontend`.
3. Set build command: `npm run build`.
4. Set output directory: `dist`.
5. Add env var `VITE_API_BASE_URL` with value `/api/v1`.
6. Deploy.

## Notes

- `vercel.json` rewrites `/api/v1/*` to the Render backend, so browser requests stay same-origin.
- Keep `VITE_API_BASE_URL=/api/v1` in Vercel for consistency with local development.
- The frontend ignores any absolute API URL in production so it does not fall back to cross-origin requests.
- Gmail activation credentials do not belong in Vercel. Set `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL` on the backend service instead.
