# AKP Project - Agent Instructions

## Architecture

- **Frontend**: React 19 + Vite 7, runs on port 5173 (ESM modules)
- **Backend**: Express.js 5, runs on port 5000 (CommonJS)
- **Database**: 3 SQL Server databases on `WARRIOR\SQLEXPRESS`
  - IcSoftVer3 (primary), IcSoftReportVer3, IcSoftLedgerVer3
- **Deployment**: Frontend on Vercel, Backend on Windows server via Cloudflare tunnel

## Key Commands

```powershell
# Backend
cd backend; npm start          # Start server on port 5000
cd backend; npm test           # Run Jest tests

# Frontend  
cd frontend; npm run dev       # Start Vite dev server on port 5173
cd frontend; npm run lint      # ESLint check
cd frontend; npm test          # Jest tests (jsdom env, --passWithNoTests in CI)

# E2E tests
npx playwright test --project=chromium  # Requires servers running
```

## Database Access

- All requests must include `x-database` header (set by frontend automatically via api.js)
- Default database: IcSoftVer3
- Connection string: `Server=WARRIOR\SQLEXPRESS;Database={db};User=sa;Password=akp@1234;TrustServerCertificate=true`

## Auth

- JWT tokens stored in HTTP-only cookies (`withCredentials: true` on all requests)
- Tokens verified via `verifyToken` middleware; role-based access via `requireRole(role)`
- Default admin: `admin` / `admin123`

## CORS

Backend allows: `localhost:*`, `*.vercel.app`, `*.trycloudflare.com`
Production cookie: `sameSite: 'none', secure: true`

## Known Quirks

- JWT_SECRET is hardcoded in server.js (should move to .env)
- Backend uses CommonJS (`"type": "commonjs"`), frontend uses ESM (`"type": "module"`)
- Test files: `src/**/*.test.{js,jsx}` and `src/**/__tests__/**`
- Playwright config at project root (not in frontend/); CI auto-starts both servers for e2e tests
- Notification system removed — app uses `sonner` (toast) for user feedback instead
- Excel parsing utilities consolidated into `backend/utils/excelImport.js`
- Invoice value SQL expression consolidated into `backend/utils/invoiceCalc.js`

## Database Selection in Requests

Frontend api.js interceptor attaches `x-database` from localStorage. To test backend directly:
```bash
curl -H "x-database: IcSoftVer3" http://localhost:5000/api/tables
```

## Deployment Flow

1. Cloudflare tunnel exposes backend at `*.trycloudflare.com`
2. Vercel frontend connects to tunnel URL via `VITE_API_URL` env var
3. If tunnel URL changes after reboot, update Vercel env var and redeploy

## Config Files

- `backend/ecosystem.config.js` - PM2 production config for backend
- `playwright.config.js` - E2E test config (webServer only starts in CI)
- `frontend/jest.config.cjs` - Jest with jsdom, babel transform, ignores node_modules except @tanstack/axios
- `backend/.env` - Local DB credentials (never commit)