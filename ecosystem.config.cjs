/**
 * Configuración PM2 para Producción
 * PM2 mantiene el servidor activo y reinicia automáticamente en caso de errores
 *
 * Instalación de PM2:
 * npm install -g pm2
 *
 * Comandos útiles:
 * pm2 start ecosystem.config.cjs
 * pm2 status
 * pm2 logs
 * pm2 restart sysme-backend
 * pm2 stop sysme-backend
 * pm2 delete sysme-backend
 */

module.exports = {
  apps: [
    {
      name: 'sysme-backend',
      script: './backend/src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      // Entorno
      env_production: {
        NODE_ENV: 'production',
        PORT: 47851,
        BACKEND_PORT: 47851,
        FRONTEND_PORT: 23847,
        FRONTEND_URL: 'http://127.0.0.1:23847',
        CORS_ORIGIN: 'http://127.0.0.1:23847,http://localhost:23847'
      },

      // Logs
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      log_file: './backend/logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Reinicio automático
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Límites de recursos
      max_memory_restart: '512M',

      // Monitoreo
      watch: false, // No recargar en cambios (producción)
      ignore_watch: ['node_modules', 'logs', 'data', 'backups', 'uploads'],

      // Cron para tareas programadas
      cron_restart: '0 3 * * *', // Reiniciar a las 3 AM diariamente

      // Configuración de kill
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Scripts
      pre_start: 'node ./backend/src/scripts/production-check.js',
      post_start: 'echo "SYSME Backend iniciado en producción"',

      // Merge logs
      merge_logs: true,

      // Configuración de Node.js
      node_args: '--max-old-space-size=512',

      // Expresiones de error para no reiniciar
      error_file_ignore_regexp: [
        /ECONNRESET/,
        /EADDRINUSE/
      ]
    }
  ]
};
