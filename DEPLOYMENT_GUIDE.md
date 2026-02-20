# 🚀 AKP Foundries ERP - Production Deployment Guide

## Final Production Architecture

```
Internet Users → akp-project-taupe.vercel.app (Frontend)
                         ↓ API calls
            Cloudflare Tunnel (Windows Service - Auto-starts)
                         ↓
          Company Server (Backend + SQL Server 2008 R2)
```

| Component | Location       | URL                                |
| --------- | -------------- | ---------------------------------- |
| Frontend  | Vercel (Cloud) | `akp-project-taupe.vercel.app`     |
| Backend   | Company Server | `*.trycloudflare.com` (via tunnel) |
| Database  | Company Server | SQL Server 2008 R2 (localhost)     |

---

## 🖥️ Company Server Setup (One-Time)

### Step 1: Install Prerequisites

```powershell
# 1. Install Node.js (v18+) from https://nodejs.org
# 2. Verify installation
node --version
npm --version
```

### Step 2: Clone Repository

```powershell
cd C:\
git clone https://github.com/AdityaMalani1302/AKP_project.git
cd AKP_project\backend
npm install
```

### Step 3: Configure Environment

Create `C:\AKP_project\backend\.env`:

```env
SQL_USER=sa
SQL_PASSWORD=YourSQLPassword
SQL_SERVER=localhost
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-key
CORS_ORIGIN=http://192.168.2.124:5173
FRONTEND_URL=https://akp-project-taupe.vercel.app
```

### Step 4: Install Cloudflared

```powershell
winget install Cloudflare.cloudflared
```

Or download from: https://github.com/cloudflare/cloudflared/releases

### Step 5: Install Cloudflared as Windows Service

```powershell
# Create config file
New-Item -Path "$env:USERPROFILE\.cloudflared" -ItemType Directory -Force
@"
url: http://localhost:5000
"@ | Out-File -FilePath "$env:USERPROFILE\.cloudflared\config.yml" -Encoding utf8

# Install as Windows service (Run as Administrator)
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" service install
```

### Step 6: Start Everything

```powershell
# Start backend
cd C:\AKP_project\backend
npm start

# Start tunnel service (one-time, then auto-starts on boot)
Start-Service cloudflared
```

---

## 📊 Check Tunnel URL

After starting the service:

```powershell
# View tunnel logs to find the URL
Get-Content "$env:USERPROFILE\.cloudflared\cloudflared.log" -Tail 50
```

Look for: `Your quick Tunnel has been created! Visit it at: https://xyz.trycloudflare.com`

---

## ⚠️ When Tunnel URL Changes

The tunnel URL changes only when:

- ❌ Server reboots completely
- ❌ Cloudflared service is stopped and started

When this happens (rarely):

1. Find new tunnel URL from logs
2. Go to **Vercel** → Project → Settings → Environment Variables
3. Update `VITE_API_URL` to new URL
4. Click **Redeploy**

---

## 🔧 Useful Commands

```powershell
# Check service status
Get-Service cloudflared

# Restart service
Restart-Service cloudflared

# View logs
Get-EventLog -LogName Application -Source cloudflared -Newest 20

# Check if backend is running
Invoke-RestMethod http://localhost:5000/api/health
```

---

## 🩺 Troubleshooting

| Issue                | Solution                                                                              |
| -------------------- | ------------------------------------------------------------------------------------- |
| Service not starting | Run `& "C:\Program Files (x86)\cloudflared\cloudflared.exe" service install` as Admin |
| CORS error           | Check `FRONTEND_URL` in `.env` matches Vercel URL                                     |
| 401 Unauthorized     | Clear browser cookies, login again                                                    |
| Database error       | Verify SQL Server is running and credentials in `.env`                                |

---

## 📞 Support

- Developer: Aditya Malani
- Documentation created: January 2026
