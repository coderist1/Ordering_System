# Frontend (React + Vite)

This app can run locally or be deployed independently (for example to Vercel).

## Required Environment Variable

The frontend uses this variable at build/runtime:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
```

If frontend and backend are served from the same domain with reverse proxy, you can use:

```bash
VITE_API_BASE_URL=/api/v1
```

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
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
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
5. Add env var `VITE_API_BASE_URL`.
6. Deploy.

## Notes

- `vercel.json` already includes SPA rewrite to `index.html`.
- Ensure backend CORS allows your frontend domain.
