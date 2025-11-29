/**
 * Script para resetear la contraseña del administrador
 * SYSME 2.0 - Corrección BUG #4
 * Fecha: 26 de Octubre de 2025
 */

import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/sysme.db');
const NEW_PASSWORD = process.argv[2] || 'Admin@2025!';

console.log('🔑 Reseteando contraseña del administrador...');
console.log('📁 Base de datos:', DB_PATH);
console.log('🔐 Nueva contraseña:', NEW_PASSWORD);
console.log('');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
    process.exit(1);
  }
});

async function resetAdminPassword() {
  try {
    // Generar hash de la nueva contraseña
    console.log('⏳ Generando hash de la contraseña...');
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);
    console.log('✅ Hash generado:', hash.substring(0, 30) + '...');
    console.log('');

    // Actualizar en la base de datos
    console.log('⏳ Actualizando en la base de datos...');
    db.run(`
      UPDATE users
      SET
        password = ?,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = datetime('now')
      WHERE username = 'admin'
    `, [hash], function(err) {
      if (err) {
        console.error('❌ Error al actualizar:', err.message);
        process.exit(1);
      }

      if (this.changes === 0) {
        console.warn('⚠️  ADVERTENCIA: No se encontró usuario "admin"');
        console.log('');
        console.log('Verifica que existe el usuario admin:');
        console.log('  sqlite3 data/sysme.db "SELECT * FROM users WHERE username = \'admin\'"');
      } else {
        console.log('✅ Contraseña del administrador reseteada exitosamente!');
        console.log('');
        console.log('📋 Detalles:');
        console.log('  - Usuario: admin');
        console.log('  - Nueva contraseña:', NEW_PASSWORD);
        console.log('  - Intentos fallidos: 0 (reseteados)');
        console.log('  - Cuenta: Desbloqueada');
        console.log('  - Filas actualizadas:', this.changes);
        console.log('');
        console.log('🎯 Ahora puedes hacer login con:');
        console.log('  curl -X POST http://localhost:47851/api/v1/auth/login \\');
        console.log('    -H "Content-Type: application/json" \\');
        console.log('    -d \'{"username":"admin","password":"' + NEW_PASSWORD + '"}\'');
      }

      db.close(() => {
        console.log('');
        console.log('✅ Proceso completado.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error al generar hash:', error.message);
    db.close();
    process.exit(1);
  }
}

resetAdminPassword();
