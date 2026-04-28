module.exports = {
  apps: [
    {
      name: "manufacturing-erp",
      script: "server.js",
      instances: 1,
      max_memory_restart: "500M",        // Restart if memory exceeds 500MB
      node_args: "--max-old-space-size=512",  // Limit Node.js heap to 512MB
      watch: false,                       // Disable watch in production
      autorestart: true,                  // Auto restart on crash
      exp_backoff_restart_delay: 100,     // Exponential backoff on restart
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
