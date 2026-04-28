# Complete Server Setup Guide for AKP Foundries ERP

This guide documents all changes made and provides step-by-step instructions to set up the ERP system on the company server.

---

## 📋 Architecture Overview

```
Internet Users → erp.akpfoundries.com (Vercel Frontend)
                         ↓ API calls
       voted-gnome-lawn-recipients.trycloudflare.com (Cloudflare Tunnel)
                         ↓
              Company Server (Backend + SQL Server)
```

| Component | Location       | URL                                             |
| --------- | -------------- | ----------------------------------------------- |
| Frontend  | Vercel (Cloud) | `akp-project-taupe.vercel.app`                  |
| Backend   | Company Server | `voted-gnome-lawn-recipients.trycloudflare.com` |
| Database  | Company Server | SQL Server 2008 R2 (localhost)                  |

---

## 🔧 What Was Changed in Code

### 1. Frontend Changes

#### File: `frontend/src/api.js`

**Purpose**: Added dynamic API URL support for cloud deployment

```javascript
// For local development: uses relative /api (proxied by Vite)
// For production: uses VITE_API_URL environment variable (Cloudflare tunnel URL)
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";
```

#### File: `frontend/.env.production` (NEW)

**Purpose**: Production environment variable for Vercel

```env
VITE_API_URL=https://voted-gnome-lawn-recipients.trycloudflare.com
```

#### File: `frontend/vercel.json` (NEW)

**Purpose**: SPA routing for React on Vercel

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### 2. Backend Changes

#### File: `backend/server.js`

**Purpose**: CORS configuration to allow Vercel and Cloudflare domains

```javascript
// Added these regex patterns in CORS:
// Allow Vercel preview deployments (*.vercel.app)
if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
  return callback(null, true);
}

// Allow Cloudflare tunnel domains (*.trycloudflare.com)
if (/^https:\/\/.*\.trycloudflare\.com$/.test(origin)) {
  return callback(null, true);
}
```

#### File: `backend/routes/authRoutes.js`

**Purpose**: Cross-origin cookie support for authentication

```javascript
// For cross-origin deployment (Vercel frontend → Cloudflare tunnel backend)
const isCloudDeployment =
  process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes("vercel.app");

res.cookie("token", token, {
  httpOnly: true,
  secure: isCloudDeployment || req.secure || req.protocol === "https",
  sameSite: isCloudDeployment ? "none" : "lax",
  maxAge: 8 * 60 * 60 * 1000,
});
```

#### File: `backend/.env.example` (NEW)

**Purpose**: Template for environment variables

```env
SQL_USER=your_sql_username
SQL_PASSWORD=your_sql_password
SQL_SERVER=localhost
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
PORT=5000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://192.168.1.10:5173
FRONTEND_URL=https://akp-project-taupe.vercel.app
```

#### File: `backend/.gitignore` (NEW)

**Purpose**: Protect sensitive files from git

```
node_modules/
.env
.env.local
logs/
```

---

## 🖥️ Company Server Setup Instructions

### Prerequisites

- Windows Server / Windows 10/11
- Node.js v18+ installed
- SQL Server 2008 R2 running with databases: `IcSoftVer3`, `IcSoftReportVer3`, `IcSoftLedgerVer3`
- Git installed

---

### Step 1: Clone the Repository

```powershell
# Open PowerShell as Administrator
cd C:\
git clone https://github.com/AdityaMalani1302/AKP_project.git
cd AKP_project
```

---

### Step 2: Install Node.js (if not installed)

Download from: https://nodejs.org/en/download/

- Choose LTS version (v18 or v20)
- Install with default options

Verify installation:

```powershell
node --version
npm --version
```

---

### Step 3: Install Backend Dependencies

```powershell
cd C:\AKP_project\backend
npm install
```

---

### Step 4: Configure Backend Environment

Create `.env` file:

```powershell
notepad .env
```

Add these values (replace with actual credentials):

```env
SQL_USER=sa
SQL_PASSWORD=YourSQLPassword
SQL_SERVER=localhost
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-this-to-something-random
CORS_ORIGIN=http://192.168.2.124:5173
FRONTEND_URL=https://akp-project-taupe.vercel.app
```

---

### Step 5: Test Backend

```powershell
npm start
```

Expected output:

```
Server running on port 5000
Connected to SQL Server Database: IcSoftVer3
Connected to SQL Server Database: IcSoftReportVer3
Connected to SQL Server Database: IcSoftLedgerVer3
```

---

### Step 6: Install Cloudflared

```powershell
# Option 1: Using winget
winget install Cloudflare.cloudflared

# Option 2: Download MSI from
# https://github.com/cloudflare/cloudflared/releases/latest
```

---

### Step 7: Install Cloudflared as Windows Service (Recommended)

This makes the tunnel run automatically on boot - no manual intervention needed!

```powershell
# Create config directory
New-Item -Path "$env:USERPROFILE\.cloudflared" -ItemType Directory -Force

# Create config file
@"
url: http://localhost:5000
"@ | Out-File -FilePath "$env:USERPROFILE\.cloudflared\config.yml" -Encoding utf8

# Install as Windows service (Run PowerShell as Administrator)
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" service install

# Start the service
Start-Service cloudflared
```

**Get the tunnel URL:**

```powershell
# Check service logs
Get-EventLog -LogName Application -Source cloudflared -Newest 10
```

Look for: `Your quick Tunnel has been created! Visit it at: https://xyz.trycloudflare.com`

---

### Step 8: Update Vercel with Tunnel URL

1. Go to https://vercel.com
2. Login with GitHub account
3. Select the project
4. Go to Settings → Environment Variables
5. Update `VITE_API_URL` with tunnel URL
6. Go to Deployments → Redeploy

---

## 🔄 Daily Operations

### The System Auto-Starts! ✅

With Windows service installed:

- ✅ Tunnel starts automatically on boot
- ✅ Tunnel auto-restarts if it crashes
- ✅ No manual intervention needed

### When Does URL Change?

| Scenario            | URL Changes?               |
| ------------------- | -------------------------- |
| Tunnel crashes      | ❌ Same URL (auto-restart) |
| Server running 24/7 | ❌ Same URL                |
| **Server reboots**  | ✅ NEW URL (rare)          |

### If Server Reboots (URL Changed):

1. Find new URL: `Get-EventLog -LogName Application -Source cloudflared -Newest 10`
2. Update Vercel `VITE_API_URL`
3. Redeploy

### Service Management Commands

```powershell
# Check status
Get-Service cloudflared

# Restart
Restart-Service cloudflared

# Stop
Stop-Service cloudflared

# Start
Start-Service cloudflared
```

---

### Running as Windows Services (Recommended for Production)

#### Option 1: Using Startup Scripts (Easiest)

```powershell
# Start the entire system
C:\AKP_project\start-erp.bat

# Stop the entire system
C:\AKP_project\stop-erp.bat
```

#### Option 2: Manual PM2 Setup

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Start backend with PM2 using ecosystem config
cd C:\AKP_project
pm2 start ecosystem.config.json

# Save PM2 config
pm2 save

# Set to auto-start on Windows boot
pm2-startup install
```

#### PM2 Management Commands

```powershell
# View running processes
pm2 list

# View logs
pm2 logs akp-erp-backend

# Restart backend
pm2 restart akp-erp-backend

# Stop backend
pm2 stop akp-erp-backend
```

---

### Health Check Endpoint

Monitor system status:

```
GET https://YOUR_TUNNEL_URL/api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": "connected"
}
```

---

## 🏢 Account Ownership & Long-term Recommendations

### Current Account Setup

| Service    | Current Owner | Current Account  |
| ---------- | ------------- | ---------------- |
| GitHub     | Aditya Malani | Personal account |
| Vercel     | Aditya Malani | Personal account |
| Cloudflare | Aditya Malani | Personal account |
| SQL Server | Company IT    | Company owned    |

### Recommendation for Long-term

For business continuity, the company should create its own accounts:

#### Option 1: Create Company Accounts (Recommended)

1. **Create a shared company email**: `it@akpfoundries.com` or similar
2. **Create accounts with that email**:
   - GitHub: Create `github.com/akpfoundries` organization
   - Vercel: Create team account at `vercel.com`
   - Cloudflare: Create account at `cloudflare.com`
3. **Transfer/Invite**:
   - GitHub: Transfer repository to company organization
   - Vercel: Invite company email as team owner
   - Cloudflare: Create new tunnel under company account

#### Option 2: Keep Developer Accounts (Current - Short-term OK)

- ✅ Works fine for testing and initial deployment
- ⚠️ Risk: If developer leaves, company loses access
- 💡 Solution: Ensure developer shares all credentials securely

### How to Transfer Later

#### GitHub Repository Transfer:

1. Go to Repository → Settings → Danger Zone
2. Click "Transfer ownership"
3. Enter new owner (company organization)

#### Vercel Project Transfer:

1. Go to Project → Settings → General
2. Click "Transfer project"
3. Enter new team/account

#### Cloudflare Tunnel Transfer:

- Easier to create new tunnel under company account
- Update Vercel `VITE_API_URL` with new tunnel URL

---

## ⚠️ Troubleshooting

### Issue: "CORS Error" in browser

**Solution**: Check that `FRONTEND_URL` in `.env` matches the Vercel URL

### Issue: "401 Unauthorized"

**Solution**: Clear browser cookies and login again

### Issue: "Database connection failed"

**Solution**:

1. Verify SQL Server is running
2. Check credentials in `.env`
3. Ensure TCP/IP is enabled in SQL Server Configuration Manager

### Issue: Tunnel URL changed

**Solution**: Update `VITE_API_URL` in Vercel and redeploy

---

## 🌐 Custom Domain Migration (erp.akpfoundries.com)

When ready to migrate from quick tunnel to permanent custom domain:

### Step 1: Move DNS to Cloudflare

1. **Sign up at** [cloudflare.com](https://cloudflare.com) (free)
2. **Add site**: Enter `akpfoundries.com`
3. **Select Free plan**
4. **Cloudflare will scan existing DNS records** - verify they're correct
5. **Update nameservers at Hostinger**:
   - Go to Hostinger → Domain → DNS Settings
   - Change nameservers to Cloudflare's (shown after adding site)
   - Wait 10-60 minutes for propagation

### Step 2: Create Named Tunnel

```powershell
# Login to Cloudflare
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create akp-erp-api

# Note the tunnel ID from output
```

### Step 3: Configure Tunnel

Edit `C:\AKP_project\cloudflare-tunnel-config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: api.akpfoundries.com
    service: http://localhost:5000
  - service: http_status:404
```

### Step 4: Route DNS

```powershell
cloudflared tunnel route dns akp-erp-api api.akpfoundries.com
```

### Step 5: Run Named Tunnel

```powershell
cloudflared tunnel --config C:\AKP_project\cloudflare-tunnel-config.yml run
```

### Step 6: Add Custom Domain to Vercel

1. Go to Vercel → Project → Settings → Domains
2. Add `erp.akpfoundries.com`
3. Add CNAME record in Cloudflare DNS:
   - Name: `erp`
   - Target: `cname.vercel-dns.com`

### Step 7: Update Environment Variables

1. **Vercel**: Update `VITE_API_URL` to `https://api.akpfoundries.com`
2. **Backend .env**: Update `FRONTEND_URL` to `https://erp.akpfoundries.com`
3. Restart backend and redeploy Vercel

### Final URLs

| Service     | URL                            |
| ----------- | ------------------------------ |
| Frontend    | `https://erp.akpfoundries.com` |
| Backend API | `https://api.akpfoundries.com` |

---

## 📁 Production Files Reference

| File                           | Purpose                        |
| ------------------------------ | ------------------------------ |
| `ecosystem.config.json`        | PM2 configuration              |
| `start-erp.bat`                | Start entire system            |
| `stop-erp.bat`                 | Stop entire system             |
| `cloudflare-tunnel-config.yml` | Named tunnel template          |
| `backend/.env.example`         | Environment variables template |

---

## 📞 Support

For issues, contact:

- Developer: Aditya Malani
- This documentation was created on: January 13, 2026
