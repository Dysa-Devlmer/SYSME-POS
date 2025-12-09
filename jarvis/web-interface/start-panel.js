#!/usr/bin/env node
// Script para iniciar el Panel Web de J.A.R.V.I.S. MARK VII
// Inicia backend y frontend automáticamente

const { spawn } = require('child_process');
const path = require('path');

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║      🚀 INICIANDO J.A.R.V.I.S. PANEL WEB                 ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// Start backend
console.log('📡 Iniciando backend API...');
const backend = spawn('node', ['web-interface/backend/server.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

// Wait a bit for backend to start
setTimeout(() => {
  console.log('');
  console.log('🎨 Iniciando frontend React...');

  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    console.error('❌ Error iniciando frontend:', err);
  });

}, 2000);

backend.on('error', (err) => {
  console.error('❌ Error iniciando backend:', err);
});

// Handle exit
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Deteniendo J.A.R.V.I.S. Panel Web...');
  process.exit(0);
});

console.log('');
console.log('✅ Panel Web iniciando...');
console.log('');
console.log('📍 URLs:');
console.log('   Backend API: http://localhost:3001/api');
console.log('   Frontend:    http://localhost:5173');
console.log('');
console.log('💡 Presiona Ctrl+C para detener');
console.log('');
