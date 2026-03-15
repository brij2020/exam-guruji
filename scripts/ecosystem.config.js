module.exports = {
  apps: [
    {
      name: 'guru-api',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/guru-ai/guru-api',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/log/pm2/guru-api-error.log',
      out_file: '/var/log/pm2/guru-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 8000,
      kill_timeout: 5000
    },
    {
      name: 'guru-ui',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/guru-ai/guru-ui',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/guru-ui-error.log',
      out_file: '/var/log/pm2/guru-ui-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 8000,
      kill_timeout: 5000
    }
  ]
};
