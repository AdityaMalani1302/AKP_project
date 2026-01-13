# 🚀 Quick Deployment Guide: Cloud Frontend + Local Backend

This guide deploys your Manufacturing ERP with:
- **Frontend** on Vercel (free, public URL)
- **Backend** on company server via Cloudflare Tunnel (free)
- **Database** stays on your local SQL Server

---

## Step 1: Push Changes to GitHub

Open PowerShell in your project folder:

```powershell
cd c:\Users\adity\OneDrive\Desktop\AKP_project

git add .
git commit -m "Add cloud deployment configuration"
git push
```

---

## Step 2: Set Up Cloudflare Tunnel on Company Server

### 2.1 Install cloudflared

```powershell
# Option A: Using winget (recommended)
winget install Cloudflare.cloudflared

# Option B: Download manually from:
# https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi
```

### 2.2 Start Quick Tunnel (for testing)

```powershell
# This creates a temporary public URL - great for testing!
cloudflared tunnel --url http://localhost:5000
```

**Output will look like:**
```
Your quick Tunnel has been created! Visit it at:
https://random-words-here.trycloudflare.com
```

📝 **Copy this URL** - you'll need it for Vercel!

> ⚠️ Note: Quick tunnels create new URLs each restart. For permanent URLs, see "Permanent Tunnel Setup" section below.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Sign up at [vercel.com](https://vercel.com) (use GitHub login)

### 3.2 Import your project
1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Add Environment Variable
1. Expand **"Environment Variables"**
2. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://random-words-here.trycloudflare.com` (your tunnel URL)

### 3.4 Click **Deploy**!

---

## Step 4: Update Backend CORS (if needed)

If you get CORS errors, add your Vercel URL to backend `.env`:

```env
FRONTEND_URL=https://your-app.vercel.app
```

Then restart the backend server.

---

## Step 5: Test Everything

1. ✅ Open your Vercel URL in browser
2. ✅ Login with your credentials
3. ✅ Create a pattern entry
4. ✅ Check SQL Server - data should be there!

---

## Permanent Tunnel Setup (Optional)

For a tunnel that doesn't change URL on restart:

```powershell
# Login to Cloudflare (one-time)
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create erp-api

# Run with your tunnel
cloudflared tunnel run erp-api

# Install as Windows service (runs on boot)
cloudflared service install
net start cloudflared
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error | Check backend console for the blocked origin, add to FRONTEND_URL |
| Connection refused | Ensure backend is running on port 5000 |
| Tunnel stops | Use permanent tunnel setup or restart cloudflared |
| API 503 error | Database not connected - check SQL Server is running |

---

## Architecture Summary

```
User Browser → Vercel (React) → Cloudflare Tunnel → Your Server (Node.js) → SQL Server
     🌐              ☁️                  🔒                💻               🗄️
   Internet         Cloud            Encrypted          On-Premises       Local DB
```

All data stays on your company server! 🔐
