/**
 * Script para crear usuario admin con contraseña hasheada
 * Ejecutar: node create-admin.js
 */

import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'sysme.db');

async function createAdmin() {
  console.log('🔧 Creando usuario admin...\n');

  try {
    const db = new Database(dbPath);

    // Contraseña: admin123
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('📝 Contraseña hasheada generada');

    // Verificar si existe el usuario admin
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    if (existingUser) {
      db.prepare(`
        UPDATE users
        SET password = ?, is_active = 1, updated_at = datetime('now')
        WHERE username = ?
      `).run(hashedPassword, 'admin');
      console.log('✅ Usuario admin actualizado');
    } else {
      db.prepare(`
        INSERT INTO users (
          username, email, password, first_name, last_name,
          role, is_active, permissions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        'admin', 'admin@sysme.local', hashedPassword,
        'Administrador', 'Sistema', 'admin', 1,
        JSON.stringify({ all: true })
      );
      console.log('✅ Usuario admin creado');
    }

    const users = db.prepare('SELECT id, username, email, role, is_active FROM users').all();
    console.log('\n📋 Usuarios en la base de datos:');
    console.table(users);

    db.close();

    console.log('\n🎉 Credenciales:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
