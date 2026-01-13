Deployment Preparation Plan
The goal is to prepare the "manufacturing-erp" application for deployment on the IT Admin's local machine, making it accessible to other employees on the company LAN.

User Review Required
IMPORTANT

IT Admin Access Required: The deployment relies on the IT Admin's laptop acting as the server. The laptop must be turned on and connected to the network for others to access it. A static IP for the admin's laptop is highly recommended to avoid connection issues if the IP changes.

Proposed Changes
Backend
Serve Static Files: Modify
server.js
to serve the compiled frontend code from ../frontend/dist.
Handle Client-Side Routing: Add a catch-all route (_) in
server.js
to serve
index.html
for any non-API requests, enabling React Router to work.
CORS & Network: Update
server.js
to listen on all network interfaces (0.0.0.0) and allow CORS from any origin (or specific LAN subnets) to facilitate LAN access.
[MODIFY]
server.js
Add app.use(express.static(path.join(\_\_dirname, '../frontend/dist')));
Add app.get('_', ...) to serve
index.html
.
Update app.listen to log the LAN IP address for convenience.
Frontend
Relative API Paths: Modify
api.js
to use a relative baseURL (/api) instead of hardcoded http://localhost:5000/api. This allows the frontend to automatically use the correct server IP/Port when served by the backend.
[MODIFY]
api.js
Change baseURL to /api.
Deployment Guide
Create Guide: Create a comprehensive DEPLOYMENT_GUIDE.md artifact detailing:
How to build the frontend.
How to start the server.
How to find the IP address.
Firewall configuration steps.
Database configuration (TCP/IP enablement).
Verification Plan
Automated Tests
Run npm run build in frontend to ensure it builds without errors.
Manual Verification
Build & Serve:
Run npm run build in frontend.
Run npm start in backend.
Access http://localhost:5000 in the browser.
Verify: The React app loads correctly (served by backend).
Verify: Data fetching works (API calls succeed).
LAN Simulation (if possible, or instruct user):
Access via http://127.0.0.1:5000 (simulating non-localhost hostname access).

---

IT Admin Deployment Guide
This guide details the steps required to set up the "manufacturing-erp" application on the IT Admin's local machine and make it available to other employees on the company LAN.

Prerequisites
Ensure the IT Admin's machine has the following installed:

Node.js: Download & Install LTS Version
SQL Server 2008 R2: Already installed (hosting the IcSoftVer3, IcSoftReportVer3, etc. databases).
Git (Optional): For pulling code updates.

1. Network Configuration (One-Time Setup)
   Static IP Address (Recommended)
   Assign a static IP address to the IT Admin's machine (e.g., 192.168.1.100) to ensure the application URL doesn't change.

Windows Firewall Rule
You must open Port 5000 to allow other computers to connect.

Open Windows Defender Firewall with Advanced Security.
Select Inbound Rules > New Rule.
Select Port > Next.
Select TCP and enter 5000 in "Specific local ports".
Select Allow the connection.
Select all profiles (Domain, Private, Public).
Name it "Manufacturing ERP Web" and click Finish.
SQL Server Configuration
Ensure SQL Server accepts TCP/IP connections.

Open SQL Server Configuration Manager.
Expand SQL Server Network Configuration > Protocols for SQLEXPRESS (or your instance name).
Right-click TCP/IP and select Enable.
Restart the SQL Server service. 2. Application Setup
Fetching the Code
Navigate to the project directory on the Desktop (e.g., C:\Users\adity\OneDrive\Desktop\AKP_project).

Build the Frontend
This compiles the React code into static files that the backend will serve.

Open a terminal (PowerShell/CMD).
Navigate to the frontend folder:
cd frontend
Install dependencies (first time only):
npm install
Build the project:
npm run build
This creates a dist folder.
Setup the Backend
Navigate to the backend folder:
cd ../backend
Install dependencies (first time only):
npm install
Database Connection: Ensure the .env file in the backend folder has the correct SQL configuration:
SQL_USER=sa
SQL_PASSWORD=your_password
SQL_SERVER=WARRIOR\SQLEXPRESS # Or localhost\SQLEXPRESS 3. Running the Application
To start the server, simply run this command in the backend folder:

npm start
You should see output like:

Connected to SQL Server Database...
Server running on port 5000
Local Access: http://localhost:5000
LAN Access: http://192.168.1.100:5000 4. Employee Access
Employees can now access the ERP system from any computer on the LAN (Wi-Fi or Ethernet) using the IT Admin's IP address.

URL: http://<IT_ADMIN_IP_ADDRESS>:5000

Example: http://192.168.1.100:5000

TIP

Bookmark: Ask employees to bookmark this URL in Chrome/Edge for easy access.

Troubleshooting
"Site cannot be reached":

Host machine might be off or asleep.
Firewall rule for Port 5000 might be missing (Check Step 1).
Ensure both computers are on the same Wi-Fi/Network.
"Database Connection Error":

SQL Server service might be stopped.
Incorrect password in backend/.env.
TCP/IP disabled in SQL Server Configuration.
