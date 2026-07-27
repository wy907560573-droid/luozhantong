module.exports = {
  apps: [{
    name: 'luozhantong',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_PATH: './data/data.db',
      UPLOAD_DIR: './uploads'
    },
    // 自动重启
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    // 日志
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
};
