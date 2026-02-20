# Manufacturing ERP - Production Setup Guide (PM2)

This guide details how to set up the Manufacturing ERP application on a production server (e.g., IT Admin PC) using **PM2** to ensure the application runs continuously in the background.

## Prerequisites

1.  **Node.js**: Ensure Node.js (v18 or higher) is installed.
    - Check with: `node -v`
2.  **SQL Server**: Ensure the machine has access to the SQL Server database.
3.  **Source Code**: The project folder must be present on the machine.

## Step 1: Install Dependencies

Open PowerShell as **Administrator** and navigate to the project folder.

1.  **Install Global Tools (PM2)**:

    ```powershell
    npm install -g pm2
    ```

2.  **Install Backend Dependencies**:

    ```powershell
    cd backend
    npm install
    # Create/Verify your .env file here ensuring database credentials are correct
    ```

3.  **Install Frontend Dependencies**:
    ```powershell
    cd ../frontend
    npm install
    ```

## Step 2: Build the Frontend

We need to compile the React frontend into static files that the backend will serve.

```powershell
# Inside /frontend directory
npm run build
```

_This typically takes 20-60 seconds. Ensure it completes with "Exit code: 0"._

## Step 3: Start the Application

We will use PM2 to start the backend server, which will also serve the frontend.

1.  **Navigate to Backend**:

    ```powershell
    cd ../backend
    ```

2.  **Start with PM2**:

    ```powershell
    pm2 start ecosystem.config.js
    ```

    _If `ecosystem.config.js` is missing, you can start it manually:_
    `pm2 start server.js --name "manufacturing-erp" --env production`

3.  **Save the Process List**:
    This freezes the current process list so it can be respawned later.
    ```powershell
    pm2 save
    ```

## Step 4: Configure Automatic Startup (Optional but Recommended)

To ensure the app restarts automatically if the computer reboots:

1.  **Install Startup Script**:

    ```powershell
    pm2-startup install
    ```

    _Follow any on-screen instructions._

2.  **Save Again**:
    ```powershell
    pm2 save
    ```

## Step 5: Verification

1.  Open Chrome/Edge on the server.
2.  Go to `http://localhost:5000`.
3.  The application should load.

## Management Commands

- **Check Status**: `pm2 status`
- **View Logs**: `pm2 logs`
- **Restart App**: `pm2 restart manufacturing-erp`
- **Stop App**: `pm2 stop manufacturing-erp`
