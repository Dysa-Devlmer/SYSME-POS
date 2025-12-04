#!/usr/bin/env node

/**
 * 🧠 JARVIS con Sistema de Memoria Automática
 *
 * Este wrapper inicia JARVIS con logging automático de todo lo que sucede.
 *
 * Uso:
 *   node core/jarvis-with-memory.cjs
 *
 * Captura automáticamente:
 * - Cada comando ejecutado
 * - Cada archivo modificado
 * - Cada interacción del usuario
 * - Estado del sistema en tiempo real
 *
 * @author J.A.R.V.I.S. MARK VII
 */

const { initMemorySystem, setupAutoSave } = require('./auto-memory-logger.cjs');
const { spawn } = require('child_process');
const path = require('path');

// Inicializar sistema de memoria
console.log('🧠 Inicializando J.A.R.V.I.S. con memoria automática...\n');
const memoryLogger = initMemorySystem();
setupAutoSave();

// Log de inicio de JARVIS
memoryLogger.logCommand('jarvis-pure.js start', 'Iniciando JARVIS MARK VII', true);
memoryLogger.logDecision(
  'Iniciar JARVIS con memoria automática',
  'Usuario quiere que todo se guarde sin intervención manual',
  'Todas las interacciones serán recordadas automáticamente'
);

// Ruta al script principal de JARVIS
const jarvisPath = path.join(__dirname, 'jarvis-pure.js');

// Verificar si existe jarvis-pure.js
const fs = require('fs');
if (!fs.existsSync(jarvisPath)) {
  console.error('❌ Error: No se encontró jarvis-pure.js');
  console.error(`   Buscado en: ${jarvisPath}`);
  console.error('\n💡 Ejecuta JARVIS manualmente y el logger seguirá activo en background.');
  process.exit(1);
}

// Spawn JARVIS como proceso hijo
console.log('🚀 Lanzando JARVIS MARK VII...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const jarvis = spawn('node', [jarvisPath], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    JARVIS_MEMORY_ENABLED: 'true'
  }
});

// Manejar salida de JARVIS
jarvis.on('exit', async (code) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`\n⚠️ JARVIS terminó con código: ${code}\n`);

  memoryLogger.logCommand(
    'jarvis-pure.js exit',
    `Proceso terminado con código ${code}`,
    code === 0
  );

  // Guardar sesión final
  await memoryLogger.endSession({
    jarvis_exit_code: code,
    notes: 'Sesión de JARVIS completada'
  });

  process.exit(code);
});

// Manejar errores
jarvis.on('error', async (error) => {
  console.error('\n❌ Error al ejecutar JARVIS:', error.message);

  memoryLogger.logCommand('jarvis-pure.js error', error.message, false);

  await memoryLogger.endSession({
    error: error.message,
    notes: 'Error al ejecutar JARVIS'
  });

  process.exit(1);
});

// Manejar interrupción (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\n\n⚠️ Interrupción detectada. Guardando memoria y cerrando JARVIS...\n');

  jarvis.kill('SIGINT');

  await memoryLogger.endSession({
    exit_reason: 'User interrupt (Ctrl+C)',
    notes: 'Usuario interrumpió JARVIS manualmente'
  });

  process.exit(0);
});

console.log('✨ Memoria automática activada. Todo será recordado...\n');
