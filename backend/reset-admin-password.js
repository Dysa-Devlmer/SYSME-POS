/**
 * Script para resetear la contraseña del usuario admin
 * Uso: node reset-admin-password.js
 */

import bcrypt from 'bcryptjs';
import knex from 'knex';

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './data/sysme_production.db'
  },
  useNullAsDefault: true
});

async function resetAdminPassword() {
  try {
    // Nueva contraseña para admin
    const newPassword = 'admin2024';

    console.log('🔒 Generando nuevo hash de contraseña...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    console.log('💾 Actualizando contraseña del usuario admin...');
    await db('users')
      .where({ username: 'admin' })
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      });

    console.log('\n✅ ¡Contraseña actualizada exitosamente!');
    console.log('\n📝 Nuevas credenciales de acceso:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin2024');
    console.log('\n🌐 URL de acceso: http://127.0.0.1:23847');
    console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login');

    await db.destroy();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error);
    process.exit(1);
  }
}

resetAdminPassword();
