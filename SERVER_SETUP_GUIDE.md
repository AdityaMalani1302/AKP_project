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

### Step 7: Start Cloudflare Tunnel

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000
```

**IMPORTANT**: Copy the tunnel URL shown (e.g., `https://voted-gnome-lawn-recipients.trycloudflare.com`)

---

### Step 8: Update Vercel (If Tunnel URL Changed)

If the tunnel URL is different from the current one:

1. Go to https://vercel.com
2. Login with GitHub account
3. Select the project
4. Go to Settings → Environment Variables
5. Update `VITE_API_URL` with new tunnel URL
6. Go to Deployments → Redeploy

---

## 🔄 Daily Operations

### Starting the System (After Server Restart)

1. **Start Backend**:

```powershell
cd C:\AKP_project\backend
npm start
```

2. **Start Tunnel** (in new PowerShell window):

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000
```

3. **If tunnel URL changed**, update Vercel (see Step 8)

---

### Running as Windows Services (Optional - Auto-start)

#### Backend Service using PM2:

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Start backend with PM2
cd C:\AKP_project\backend
pm2 start npm --name "erp-backend" -- start

# Save PM2 config
pm2 save

# Set to auto-start on Windows boot
pm2-startup install
```

---

## 🔐 Account Credentials Required

| Service    | Account Owner | What's Needed          |
| ---------- | ------------- | ---------------------- |
| GitHub     | Aditya        | Code repository access |
| Vercel     | Aditya        | Frontend hosting       |
| Cloudflare | Aditya        | Tunnel management      |
| SQL Server | Company IT    | Database credentials   |

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

## 📞 Support

For issues, contact:

- Developer: Aditya Malani
- This documentation was created on: January 13, 2026
