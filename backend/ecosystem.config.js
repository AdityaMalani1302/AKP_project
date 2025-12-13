module.exports = {
  apps: [
    {
      name: "manufacturing-erp",
      script: "server.js",
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
